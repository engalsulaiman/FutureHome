# FutureHome Agents

Long-running daemons that register with the orchestrator, poll for assigned
tasks, run them, and report results.

Three agent kinds are supported:

| Kind      | Purpose                                                   |
| --------- | --------------------------------------------------------- |
| `infra`   | Ping / TCP / HTTP / disk / cert-expiry health checks      |
| `browser` | Drives Playwright (Chromium) through declarative steps    |
| `ai`      | Uses Claude to propose, run, and triage tests in a repo   |

All three share the same protocol — a 5-second poll loop calling
`POST /api/agents/tasks/claim` and reporting back via
`POST /api/agents/tasks/{id}/result`.

## Install

```bash
cd agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Register an agent

1. As an org admin, create an agent in the UI (or `POST /api/agents/`).
   The response contains a one-time `token` field — copy it.
2. Run the daemon:

   ```bash
   python -m agent \
     --kind infra \
     --server http://localhost:8000 \
     --token agent_xxxxxxxxxxxxxxxxxxxx \
     --name worker-01
   ```

The daemon logs to stdout. CTRL-C to stop.

## Per-kind setup

| Kind      | Extra setup                                                                       |
| --------- | --------------------------------------------------------------------------------- |
| `infra`   | None — `httpx` only.                                                              |
| `browser` | `pip install playwright` then `playwright install chromium`. Override the binary by setting `PLAYWRIGHT_CHROMIUM_PATH` if needed. |
| `ai`      | Set `ANTHROPIC_API_KEY` in the daemon's environment. Defaults to `claude-opus-4-8`; override per-task via `payload.model`. |

## Infra task payload schema

```json
{
  "checks": [
    {"type": "ping",        "target": "google.com",      "count": 4},
    {"type": "tcp",         "host": "example.com",        "port": 443, "timeout": 5},
    {"type": "http",        "url": "https://example.com", "expect_status": 200, "timeout": 10},
    {"type": "disk",        "path": "/",                  "min_free_pct": 10},
    {"type": "cert_expiry", "host": "example.com",        "port": 443, "min_days": 30}
  ]
}
```

The agent runs every check, capturing pass/fail per check, and reports a
single terminal status (`passed` if all checks passed, `failed` if any
check failed without raising, `error` if the runner itself crashed).

## Browser task payload schema

```json
{
  "base_url": "https://example.com",
  "viewport": {"width": 1280, "height": 720},
  "timeout_ms": 10000,
  "steps": [
    {"goto": "/login"},
    {"fill": {"selector": "#email", "value": "demo@x.com"}},
    {"click": {"selector": "#submit"}},
    {"wait_for": {"selector": "#welcome"}},
    {"expect_text": "Welcome"},
    {"expect_url_contains": "/dashboard"}
  ]
}
```

Per-step `passed/failed` records plus a base64 PNG of the final page
state are returned in `result`. The runner stops on the first failing
step.

## AI test task payload schema

```json
{
  "repo_url": "https://github.com/user/repo",
  "ref": "main",
  "instruction": "Write a unit test for src/calculator.py covering add and divide-by-zero",
  "target_files": ["src/calculator.py"],
  "test_command": "pytest -q",
  "model": "claude-opus-4-8"
}
```

The agent clones the repo (shallow), asks Claude for a focused test file
via structured outputs, writes the file under the repo root, executes
`test_command`, and reports `passed` on exit-0 or `failed` plus a triage
report (`{verdict, summary, suggested_fix}`) on non-zero exit.
