"""Infra health-check runner.

Each check returns a dict like:
    {"check": "...", "passed": bool, "detail": str, "metrics": {...}}

The runner aggregates them into one report — terminal status is `passed`
if every check passed, `failed` if any failed, `error` only if the runner
itself crashes (handled in agent.base).
"""
from __future__ import annotations

import io
import shutil
import socket
import ssl
import subprocess
from datetime import datetime, timezone
from typing import Any

import httpx


def run(payload: dict) -> dict:
    checks = payload.get("checks") or []
    if not isinstance(checks, list) or not checks:
        return {
            "status": "error",
            "result": None,
            "logs": "",
            "error_message": "Payload must include a non-empty 'checks' list",
        }

    log = io.StringIO()
    results: list[dict[str, Any]] = []
    for spec in checks:
        kind = (spec or {}).get("type")
        handler = _HANDLERS.get(kind)
        if handler is None:
            results.append({"check": kind or "?", "passed": False,
                            "detail": f"Unknown check type: {kind!r}"})
        else:
            try:
                results.append(handler(spec))
            except Exception as exc:  # noqa: BLE001
                results.append({"check": kind, "passed": False, "detail": f"Check raised: {exc!r}"})
        last = results[-1]
        log.write(f"[{'PASS' if last['passed'] else 'FAIL'}] {last['check']}: {last.get('detail', '')}\n")

    all_passed = all(r["passed"] for r in results)
    return {
        "status": "passed" if all_passed else "failed",
        "result": {"checks": results, "summary": _summary(results)},
        "logs": log.getvalue(),
        "error_message": None,
    }


def _summary(results: list[dict]) -> dict:
    return {
        "total": len(results),
        "passed": sum(1 for r in results if r["passed"]),
        "failed": sum(1 for r in results if not r["passed"]),
    }


# ---------- check handlers ----------

def _check_ping(spec: dict) -> dict:
    target = spec["target"]
    count = int(spec.get("count", 4))
    proc = subprocess.run(
        ["ping", "-c", str(count), "-W", "2", target],
        capture_output=True, text=True, timeout=count * 3 + 5,
    )
    return {
        "check": f"ping {target}",
        "passed": proc.returncode == 0,
        "detail": (proc.stdout + proc.stderr).strip()[-400:],
    }


def _check_tcp(spec: dict) -> dict:
    host, port = spec["host"], int(spec["port"])
    timeout = float(spec.get("timeout", 5))
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return {"check": f"tcp {host}:{port}", "passed": True, "detail": "connected"}
    except OSError as exc:
        return {"check": f"tcp {host}:{port}", "passed": False, "detail": str(exc)}


def _check_http(spec: dict) -> dict:
    url = spec["url"]
    expect = int(spec.get("expect_status", 200))
    timeout = float(spec.get("timeout", 10))
    try:
        resp = httpx.get(url, timeout=timeout, follow_redirects=True)
        ok = resp.status_code == expect
        return {
            "check": f"http {url}",
            "passed": ok,
            "detail": f"status={resp.status_code} expected={expect} bytes={len(resp.content)}",
            "metrics": {"status": resp.status_code, "elapsed_ms": int(resp.elapsed.total_seconds() * 1000)},
        }
    except httpx.HTTPError as exc:
        return {"check": f"http {url}", "passed": False, "detail": f"request failed: {exc!r}"}


def _check_disk(spec: dict) -> dict:
    path = spec.get("path", "/")
    min_free_pct = float(spec.get("min_free_pct", 10))
    usage = shutil.disk_usage(path)
    free_pct = usage.free / usage.total * 100 if usage.total else 0
    return {
        "check": f"disk {path}",
        "passed": free_pct >= min_free_pct,
        "detail": f"free={free_pct:.1f}% threshold={min_free_pct:.1f}%",
        "metrics": {
            "total_bytes": usage.total,
            "free_bytes": usage.free,
            "free_pct": round(free_pct, 2),
        },
    }


def _check_cert_expiry(spec: dict) -> dict:
    host, port = spec["host"], int(spec.get("port", 443))
    min_days = int(spec.get("min_days", 30))
    ctx = ssl.create_default_context()
    with socket.create_connection((host, port), timeout=10) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as ssock:
            cert = ssock.getpeercert()
    not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    days_left = (not_after - datetime.now(timezone.utc)).days
    return {
        "check": f"cert {host}:{port}",
        "passed": days_left >= min_days,
        "detail": f"expires_in={days_left}d threshold={min_days}d (notAfter={cert['notAfter']})",
        "metrics": {"days_until_expiry": days_left},
    }


_HANDLERS = {
    "ping": _check_ping,
    "tcp": _check_tcp,
    "http": _check_http,
    "disk": _check_disk,
    "cert_expiry": _check_cert_expiry,
}
