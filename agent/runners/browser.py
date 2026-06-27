"""Browser E2E runner.

Drives Playwright (Chromium) through a declarative list of steps.

Payload schema:

    {
      "base_url": "https://example.com",   // optional; prepended to relative goto paths
      "viewport": {"width": 1280, "height": 720},  // optional
      "timeout_ms": 10000,                  // per-step default
      "steps": [
        {"goto": "/"},
        {"fill": {"selector": "#email", "value": "foo@bar.com"}},
        {"click": {"selector": "#submit"}},
        {"wait_for": {"selector": "#welcome"}},
        {"expect_text": "Welcome"},
        {"expect_url_contains": "/dashboard"}
      ]
    }

Each step is captured with its outcome. The runner stops on the first
failing step and reports a base64 PNG screenshot of the page at the
moment of failure (or success of the final step).
"""
from __future__ import annotations

import base64
import io
import os
from typing import Any
from urllib.parse import urljoin


def run(payload: dict) -> dict:
    try:
        from playwright.sync_api import Error as PWError
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        return _error(f"Playwright is not installed in this environment ({exc}). "
                      f"Run: pip install playwright && playwright install chromium")

    steps = payload.get("steps") or []
    if not isinstance(steps, list) or not steps:
        return _error("Payload must include a non-empty 'steps' list")

    base_url = (payload.get("base_url") or "").rstrip("/")
    viewport = payload.get("viewport") or {"width": 1280, "height": 720}
    default_timeout = int(payload.get("timeout_ms", 10000))

    log = io.StringIO()
    step_results: list[dict[str, Any]] = []
    screenshot_b64: str | None = None
    overall_status = "passed"
    failure_index: int | None = None

    browser_path = os.getenv("PLAYWRIGHT_CHROMIUM_PATH")
    if not browser_path:
        # Fall back to the symlink that managed environments commonly provide.
        for candidate in ("/opt/pw-browsers/chromium",):
            if os.path.exists(candidate):
                browser_path = candidate
                break
    launch_kwargs: dict[str, Any] = {"headless": True}
    if browser_path:
        launch_kwargs["executable_path"] = browser_path

    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(**launch_kwargs)
        except PWError as exc:
            return _error(f"Failed to launch Chromium: {exc}")

        context = browser.new_context(viewport=viewport)
        page = context.new_page()
        page.set_default_timeout(default_timeout)

        for idx, step in enumerate(steps):
            label = _describe(step)
            try:
                _execute_step(step, page, base_url)
                step_results.append({"index": idx, "step": label, "passed": True})
                log.write(f"[PASS] {label}\n")
            except (PWError, AssertionError, ValueError) as exc:
                msg = str(exc).splitlines()[0] if str(exc) else exc.__class__.__name__
                step_results.append({"index": idx, "step": label, "passed": False, "detail": msg})
                log.write(f"[FAIL] {label}: {msg}\n")
                overall_status = "failed"
                failure_index = idx
                break

        try:
            shot = page.screenshot(full_page=False)
            screenshot_b64 = base64.b64encode(shot).decode("ascii")
        except PWError as exc:
            log.write(f"[warn] screenshot failed: {exc}\n")

        browser.close()

    return {
        "status": overall_status,
        "result": {
            "steps": step_results,
            "summary": {
                "total": len(steps),
                "executed": len(step_results),
                "failed_index": failure_index,
            },
            "screenshot_b64": screenshot_b64,
            "screenshot_mime": "image/png",
        },
        "logs": log.getvalue(),
        "error_message": None,
    }


def _execute_step(step: dict, page, base_url: str) -> None:
    if "goto" in step:
        target = step["goto"]
        if base_url and not target.startswith(("http://", "https://")):
            target = urljoin(base_url + "/", target.lstrip("/"))
        page.goto(target, wait_until="domcontentloaded")
        return
    if "fill" in step:
        spec = step["fill"]
        page.locator(spec["selector"]).fill(spec["value"])
        return
    if "click" in step:
        spec = step["click"]
        page.locator(spec["selector"]).click()
        return
    if "wait_for" in step:
        spec = step["wait_for"]
        page.locator(spec["selector"]).wait_for(state=spec.get("state", "visible"))
        return
    if "expect_text" in step:
        needle = step["expect_text"]
        body = page.content()
        if needle not in body:
            raise AssertionError(f"text {needle!r} not found on page")
        return
    if "expect_url_contains" in step:
        needle = step["expect_url_contains"]
        if needle not in page.url:
            raise AssertionError(f"URL {page.url!r} does not contain {needle!r}")
        return
    if "screenshot" in step:
        # No-op here — the final screenshot is captured after the loop.
        return
    raise ValueError(f"Unknown step shape: {list(step.keys())}")


def _describe(step: dict) -> str:
    if "goto" in step:
        return f"goto {step['goto']}"
    if "fill" in step:
        return f"fill {step['fill']['selector']}"
    if "click" in step:
        return f"click {step['click']['selector']}"
    if "wait_for" in step:
        return f"wait_for {step['wait_for']['selector']}"
    if "expect_text" in step:
        return f"expect_text {step['expect_text']!r}"
    if "expect_url_contains" in step:
        return f"expect_url_contains {step['expect_url_contains']!r}"
    if "screenshot" in step:
        return "screenshot"
    return f"unknown({list(step.keys())})"


def _error(message: str) -> dict:
    return {"status": "error", "result": None, "logs": "", "error_message": message}
