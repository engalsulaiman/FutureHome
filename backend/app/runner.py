"""In-process async runner for executing test suites.

Production deployments should swap this out for a real queue (Celery/RQ/Arq)
with isolated workers. For the MVP we run commands via asyncio subprocesses
and stream stdout/stderr into the DB.
"""
from __future__ import annotations

import asyncio
import os
import shlex
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import RunStatus, TestRun, TestSuite


async def _stream(proc: asyncio.subprocess.Process, sink: list[str]) -> None:
    assert proc.stdout is not None
    while True:
        chunk = await proc.stdout.readline()
        if not chunk:
            break
        sink.append(chunk.decode(errors="replace"))


def _persist(run_id: int, **fields) -> None:
    db: Session = SessionLocal()
    try:
        run = db.get(TestRun, run_id)
        if not run:
            return
        for key, value in fields.items():
            setattr(run, key, value)
        db.commit()
    finally:
        db.close()


async def execute_run(run_id: int) -> None:
    db: Session = SessionLocal()
    try:
        run = db.get(TestRun, run_id)
        if not run or run.status != RunStatus.pending:
            return
        suite = db.get(TestSuite, run.suite_id)
        if not suite:
            _persist(run_id, status=RunStatus.error, error_message="Suite not found",
                     finished_at=datetime.now(timezone.utc))
            return
        command = suite.command
        cwd = suite.working_dir or os.getcwd()
        env = {**os.environ, **(suite.env or {})}
        timeout = suite.timeout_seconds
    finally:
        db.close()

    _persist(run_id, status=RunStatus.running, started_at=datetime.now(timezone.utc))

    sink: list[str] = []
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            cwd=cwd,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        try:
            await asyncio.wait_for(_stream(proc, sink), timeout=timeout)
            exit_code = await proc.wait()
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            sink.append(f"\n[runner] Timeout after {timeout}s — process killed.\n")
            _persist(
                run_id,
                status=RunStatus.error,
                exit_code=None,
                logs="".join(sink),
                error_message="Timed out",
                finished_at=datetime.now(timezone.utc),
            )
            return
    except FileNotFoundError as exc:
        _persist(
            run_id,
            status=RunStatus.error,
            logs="".join(sink),
            error_message=f"Command not found: {shlex.split(command)[0] if command else ''} ({exc})",
            finished_at=datetime.now(timezone.utc),
        )
        return
    except Exception as exc:  # noqa: BLE001 — runner must never crash the API
        _persist(
            run_id,
            status=RunStatus.error,
            logs="".join(sink),
            error_message=f"Runner error: {exc!r}",
            finished_at=datetime.now(timezone.utc),
        )
        return

    final_status = RunStatus.passed if exit_code == 0 else RunStatus.failed
    _persist(
        run_id,
        status=final_status,
        exit_code=exit_code,
        logs="".join(sink),
        finished_at=datetime.now(timezone.utc),
    )


def schedule_run(run_id: int) -> None:
    """Fire-and-forget kickoff from a sync request handler."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(execute_run(run_id))
    except RuntimeError:
        asyncio.run(execute_run(run_id))
