import argparse
import logging
import os
import sys

from .base import AgentConfig, run_agent
from .runners import infra


def main() -> None:
    parser = argparse.ArgumentParser(prog="agent", description="FutureHome test agent daemon")
    parser.add_argument("--kind", required=True, choices=["infra", "browser", "ai"])
    parser.add_argument("--server", default=os.getenv("AGENT_SERVER", "http://localhost:8000"))
    parser.add_argument("--token", default=os.getenv("AGENT_TOKEN"), required=False)
    parser.add_argument("--name", default=os.getenv("AGENT_NAME", "agent-01"))
    parser.add_argument("--capabilities", default="", help="Comma-separated capability tags")
    parser.add_argument("--poll-interval", type=float, default=5.0)
    parser.add_argument("--heartbeat-interval", type=float, default=30.0)
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()

    if not args.token:
        parser.error("--token is required (or set AGENT_TOKEN env var)")

    logging.basicConfig(
        level=args.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    cfg = AgentConfig(
        server=args.server,
        token=args.token,
        kind=args.kind,
        name=args.name,
        capabilities=[c.strip() for c in args.capabilities.split(",") if c.strip()],
        poll_interval=args.poll_interval,
        heartbeat_interval=args.heartbeat_interval,
    )

    runner = _runner_for(args.kind)
    try:
        run_agent(cfg, runner)
    except KeyboardInterrupt:
        sys.exit(0)


def _runner_for(kind: str):
    if kind == "infra":
        return infra.run
    if kind == "browser":
        raise SystemExit("Browser agent ships in Phase 2 — not yet implemented")
    if kind == "ai":
        raise SystemExit("AI agent ships in Phase 3 — not yet implemented")
    raise SystemExit(f"Unknown agent kind: {kind}")
