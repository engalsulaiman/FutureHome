"""Common agent loop: register / heartbeat / poll / run / report."""
from __future__ import annotations

import logging
import socket
import threading
import time
from dataclasses import dataclass
from typing import Any, Callable

import httpx

log = logging.getLogger("agent")

RunnerFn = Callable[[dict], dict]
# A runner takes a task payload and returns:
#   {"status": "passed"|"failed"|"error", "result": {...}, "logs": "...", "error_message": "..."}


@dataclass
class AgentConfig:
    server: str
    token: str
    kind: str
    name: str
    capabilities: list[str]
    poll_interval: float = 5.0
    heartbeat_interval: float = 30.0


class AgentClient:
    def __init__(self, cfg: AgentConfig):
        self.cfg = cfg
        self.client = httpx.Client(
            base_url=cfg.server.rstrip("/"),
            headers={"X-Agent-Token": cfg.token},
            timeout=30.0,
        )

    def heartbeat(self) -> None:
        self.client.post(
            "/api/agents/heartbeat",
            json={"hostname": socket.gethostname(), "capabilities": self.cfg.capabilities},
        ).raise_for_status()

    def claim(self) -> dict[str, Any] | None:
        resp = self.client.post("/api/agents/tasks/claim")
        resp.raise_for_status()
        if resp.content == b"null":
            return None
        return resp.json()

    def report(self, task_id: int, status: str, result: dict | None, logs: str, error_message: str | None) -> None:
        self.client.post(
            f"/api/agents/tasks/{task_id}/result",
            json={
                "status": status,
                "result": result,
                "logs": logs,
                "error_message": error_message,
            },
        ).raise_for_status()


def run_agent(cfg: AgentConfig, runner: RunnerFn) -> None:
    log.info("Agent starting — kind=%s name=%s server=%s", cfg.kind, cfg.name, cfg.server)
    client = AgentClient(cfg)

    try:
        client.heartbeat()
        log.info("Registered with server")
    except httpx.HTTPError as exc:
        log.error("Initial heartbeat failed: %s", exc)
        raise

    stop = threading.Event()

    def heartbeat_loop() -> None:
        while not stop.is_set():
            try:
                client.heartbeat()
            except httpx.HTTPError as exc:
                log.warning("Heartbeat failed: %s", exc)
            stop.wait(cfg.heartbeat_interval)

    hb = threading.Thread(target=heartbeat_loop, daemon=True)
    hb.start()

    try:
        while not stop.is_set():
            try:
                task = client.claim()
            except httpx.HTTPError as exc:
                log.warning("Claim failed: %s", exc)
                stop.wait(cfg.poll_interval)
                continue

            if task is None:
                stop.wait(cfg.poll_interval)
                continue

            log.info("Claimed task #%s (%s) — %s", task["id"], task["kind"], task["name"])
            outcome = _run_task_safely(runner, task["payload"] or {})
            try:
                client.report(
                    task["id"],
                    outcome["status"],
                    outcome.get("result"),
                    outcome.get("logs", ""),
                    outcome.get("error_message"),
                )
                log.info("Reported task #%s → %s", task["id"], outcome["status"])
            except httpx.HTTPError as exc:
                log.error("Failed to report task #%s: %s", task["id"], exc)
    except KeyboardInterrupt:
        log.info("Shutdown requested")
    finally:
        stop.set()


def _run_task_safely(runner: RunnerFn, payload: dict) -> dict:
    try:
        return runner(payload)
    except Exception as exc:  # noqa: BLE001 — runner crash must not kill the daemon
        log.exception("Runner raised")
        return {
            "status": "error",
            "result": None,
            "logs": "",
            "error_message": f"Runner exception: {exc!r}",
        }
