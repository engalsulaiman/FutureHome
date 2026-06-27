# FutureHome — Automated Test Orchestration

Multi-tenant platform to orchestrate, schedule, and monitor automated test runs.

## Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite (swappable for Postgres), JWT auth.
- **Frontend:** React + Vite + TypeScript.
- **Runner:** In-process async executor that shells out to test commands and streams logs back through the API.

## Architecture

```
Organization
  └─ User (member, admin, owner)
  └─ Project
       └─ TestSuite (name, command, working_dir, env, schedule)
            └─ TestRun (status, started_at, finished_at, exit_code)
                 └─ Log lines (streamed)
```

Tenants are isolated by `organization_id` on every resource; every API call resolves the caller's org membership and filters accordingly.

## Quick start

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to the backend on port 8000.

## First-time setup

1. `POST /api/auth/register` creates a user **and** a new organization (the user becomes its owner).
2. Create a Project, then a Test Suite (e.g., `command: "pytest -q"`, `working_dir: "/path/to/repo"`).
3. Trigger a run from the UI or `POST /api/runs/` — the runner executes the command and captures logs/exit code.

## Roadmap (post-MVP)

- Scheduled runs (cron expressions).
- Webhook triggers (Git push).
- Distributed runners with capability tags.
- Flaky-test detection and historical trend dashboards.
- SSO (OIDC / SAML) for enterprise tenants.
