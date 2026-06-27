"""AI test agent runner.

Uses Claude to read a repository, propose a focused unit test, execute it,
and triage failures. Default model is `claude-opus-4-8`; override per-task
with `model` in the payload. Adaptive thinking is enabled — the API
picks an appropriate depth per call (see the FutureHome /claude-api skill).

Payload schema:

    {
      "repo_url": "https://github.com/user/repo",     // required
      "ref": "main",                                  // optional, default HEAD
      "instruction": "Write a test for foo.add",      // required
      "target_files": ["src/foo.py"],                 // optional; auto-discovered if omitted
      "test_command": "pytest -q",                    // optional; default pytest -q
      "model": "claude-opus-4-8",                     // optional
      "max_tokens": 16000                             // optional
    }

Reports status `passed` (test ran and exit=0), `failed` (test ran and
exit!=0; triage attached), or `error` (couldn't generate or execute).

Requires `ANTHROPIC_API_KEY` in the agent's environment.
"""
from __future__ import annotations

import io
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

DEFAULT_MODEL = "claude-opus-4-8"


def run(payload: dict) -> dict:
    repo_url = payload.get("repo_url")
    instruction = payload.get("instruction")
    if not repo_url or not instruction:
        return _error("Payload must include 'repo_url' and 'instruction'")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        return _error(
            "ANTHROPIC_API_KEY is not set in this agent's environment. "
            "Export it before starting the agent daemon."
        )

    try:
        import anthropic
        from pydantic import BaseModel, Field
    except ImportError as exc:
        return _error(f"Required package not installed: {exc}")

    ref = payload.get("ref") or "HEAD"
    target_files = payload.get("target_files") or []
    test_command = payload.get("test_command") or "pytest -q"
    model = payload.get("model") or DEFAULT_MODEL
    max_tokens = int(payload.get("max_tokens", 16000))

    log = io.StringIO()
    work_dir = Path(tempfile.mkdtemp(prefix="agent-ai-"))

    class TestProposal(BaseModel):
        filename: str = Field(description="Relative path under the repo root, e.g. tests/test_calc_generated.py")
        content: str = Field(description="Complete test file content, ready to write to disk")
        rationale: str = Field(description="One-paragraph rationale for what is being tested and why")

    class Triage(BaseModel):
        verdict: str = Field(description="One of: test_bug, code_bug, environment_issue, unclear")
        summary: str = Field(description="One-paragraph summary of the failure and its likely cause")
        suggested_fix: str = Field(description="Concrete next step a developer could take")

    try:
        repo = work_dir / "repo"
        clone_err = _clone_repo(repo_url, ref, repo, log)
        if clone_err:
            return _error(clone_err)

        files_context = _read_target_files(repo, target_files, log)

        client = anthropic.Anthropic()

        gen_response = client.messages.parse(
            model=model,
            max_tokens=max_tokens,
            thinking={"type": "adaptive"},
            system=(
                "You are a senior software test engineer. Given an instruction and source code, "
                "write a focused, runnable test file that exercises the target behavior. "
                "Prefer the project's existing test framework if one is in use. "
                "Keep the test minimal and self-contained — no fixtures shared with other tests, "
                "no network calls, no sleeps."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Instruction:\n{instruction}\n\n"
                    f"Repository contents (truncated):\n{files_context}\n\n"
                    "Return the test file as filename + content + rationale."
                ),
            }],
            output_format=TestProposal,
        )
        if gen_response.stop_reason == "refusal":
            return {
                "status": "error",
                "result": None,
                "logs": log.getvalue(),
                "error_message": f"Model refused the request: {gen_response.stop_details}",
            }

        proposal: TestProposal = gen_response.parsed_output
        log.write(f"[claude] proposed {proposal.filename}\n")
        log.write(f"[claude] rationale: {proposal.rationale}\n")

        target_path = (repo / proposal.filename).resolve()
        if not _is_within(target_path, repo.resolve()):
            return _error(f"Refusing to write outside repo root: {proposal.filename}")
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(proposal.content)
        log.write(f"[write] {proposal.filename} ({len(proposal.content)} chars)\n")

        log.write(f"[exec] {test_command}\n")
        run_proc = subprocess.run(
            test_command, shell=True, cwd=str(repo),
            capture_output=True, text=True, timeout=300,
        )
        combined = (run_proc.stdout or "") + (run_proc.stderr or "")
        log.write(combined[-1500:] + "\n")

        result: dict[str, Any] = {
            "filename": proposal.filename,
            "rationale": proposal.rationale,
            "run_command": test_command,
            "exit_code": run_proc.returncode,
            "stdout_tail": (run_proc.stdout or "")[-2000:],
            "stderr_tail": (run_proc.stderr or "")[-2000:],
            "model": model,
        }

        if run_proc.returncode == 0:
            return {
                "status": "passed",
                "result": result,
                "logs": log.getvalue(),
                "error_message": None,
            }

        triage_response = client.messages.parse(
            model=model,
            max_tokens=4000,
            thinking={"type": "adaptive"},
            system=(
                "You are a senior debugger. Triage the failing test run and decide whether "
                "the failure is in the test, in the code under test, or in the environment. "
                "Be specific about the next concrete step."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"Test file ({proposal.filename}):\n```\n{proposal.content}\n```\n\n"
                    f"Command: {test_command}\nExit code: {run_proc.returncode}\n\n"
                    f"Stdout:\n{(run_proc.stdout or '')[-2000:]}\n\n"
                    f"Stderr:\n{(run_proc.stderr or '')[-2000:]}\n"
                ),
            }],
            output_format=Triage,
        )
        if triage_response.stop_reason != "refusal":
            triage: Triage = triage_response.parsed_output
            result["triage"] = {
                "verdict": triage.verdict,
                "summary": triage.summary,
                "suggested_fix": triage.suggested_fix,
            }
            log.write(f"[triage] {triage.verdict}: {triage.summary[:200]}\n")

        return {
            "status": "failed",
            "result": result,
            "logs": log.getvalue(),
            "error_message": None,
        }
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def _clone_repo(repo_url: str, ref: str, dest: Path, log: io.StringIO) -> str | None:
    log.write(f"[clone] {repo_url} @ {ref}\n")
    cmd = ["git", "clone", "--depth=1"]
    if ref and ref != "HEAD":
        cmd += ["--branch", ref]
    cmd += [repo_url, str(dest)]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
    if proc.returncode != 0 and ref and ref != "HEAD":
        # Retry without --branch; ref may not exist as a branch (e.g. it's a commit).
        proc = subprocess.run(
            ["git", "clone", "--depth=1", repo_url, str(dest)],
            capture_output=True, text=True, timeout=180,
        )
    if proc.returncode != 0:
        return f"git clone failed: {(proc.stderr or proc.stdout).strip()[-400:]}"
    return None


def _read_target_files(repo: Path, target_files: list[str], log: io.StringIO) -> str:
    contents: list[str] = []
    files_to_read: list[Path] = []

    if target_files:
        for rel in target_files:
            p = (repo / rel).resolve()
            if _is_within(p, repo.resolve()) and p.is_file():
                files_to_read.append(p)
    else:
        for name in ("README.md", "README.rst", "pyproject.toml", "package.json"):
            p = repo / name
            if p.is_file():
                files_to_read.append(p)
        for pattern in ("*.py", "src/**/*.py", "lib/**/*.py"):
            files_to_read.extend(list(repo.glob(pattern))[:5])
        files_to_read = files_to_read[:8]

    for p in files_to_read:
        try:
            text = p.read_text(errors="replace")[:8000]
        except OSError:
            continue
        rel = p.relative_to(repo)
        contents.append(f"--- {rel} ---\n{text}")
        log.write(f"[read] {rel} ({len(text)} chars)\n")

    return "\n\n".join(contents) or "(no readable files found)"


def _is_within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root)
        return True
    except ValueError:
        return False


def _error(message: str) -> dict:
    return {"status": "error", "result": None, "logs": "", "error_message": message}
