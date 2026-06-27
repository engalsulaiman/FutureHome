# FutureHome Agents

Long-running daemons that register with the orchestrator, poll for assigned
tasks, run them, and report results.

Three agent kinds are planned:

| Kind      | Status     | Purpose                                                   |
| --------- | ---------- | --------------------------------------------------------- |
| `infra`   | ✅ Phase 1 | Ping / TCP / HTTP / disk / cert-expiry health checks      |
| `browser` | ⏳ Phase 2 | Drives Playwright through declarative user-journey steps  |
| `ai`      | ⏳ Phase 3 | Uses Claude to propose, run, and triage tests in a repo   |

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
