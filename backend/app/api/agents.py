from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_agent, get_current_membership, get_current_org, require_admin
from ..models import (
    Agent,
    AgentTask,
    AgentTaskStatus,
    Membership,
    Organization,
)
from ..schemas import (
    AgentCreate,
    AgentCreated,
    AgentHeartbeat,
    AgentOut,
    AgentTaskClaim,
    AgentTaskCreate,
    AgentTaskDetail,
    AgentTaskOut,
    AgentTaskReport,
    UserOut,
)
from ..security import generate_agent_token, hash_agent_token

router = APIRouter(prefix="/agents", tags=["agents"])
tasks_router = APIRouter(prefix="/agent-tasks", tags=["agent-tasks"])


# ---------- Admin/user-facing agent CRUD ----------

@router.get("/", response_model=list[AgentOut])
def list_agents(
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> list[Agent]:
    return (
        db.query(Agent)
        .filter(Agent.organization_id == org.id)
        .order_by(Agent.created_at.desc())
        .all()
    )


@router.post("/", response_model=AgentCreated, status_code=status.HTTP_201_CREATED)
def create_agent(
    payload: AgentCreate,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    _admin=Depends(require_admin),
) -> AgentCreated:
    if db.query(Agent).filter(Agent.organization_id == org.id, Agent.name == payload.name).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Agent name already used in this organization")
    token = generate_agent_token()
    agent = Agent(
        organization_id=org.id,
        kind=payload.kind,
        name=payload.name,
        description=payload.description,
        capabilities=payload.capabilities,
        token_hash=hash_agent_token(token),
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return AgentCreated(
        **AgentOut.model_validate(agent).model_dump(),
        token=token,
    )


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(
    agent_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> Agent:
    agent = (
        db.query(Agent)
        .filter(Agent.id == agent_id, Agent.organization_id == org.id)
        .first()
    )
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    _admin=Depends(require_admin),
) -> None:
    agent = (
        db.query(Agent)
        .filter(Agent.id == agent_id, Agent.organization_id == org.id)
        .first()
    )
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found")
    db.delete(agent)
    db.commit()


# ---------- Agent-facing endpoints (X-Agent-Token auth) ----------

@router.post("/heartbeat", response_model=AgentOut)
def heartbeat(
    payload: AgentHeartbeat,
    db: Annotated[Session, Depends(get_db)],
    agent: Annotated[Agent, Depends(get_current_agent)],
) -> Agent:
    agent.last_seen_at = datetime.now(timezone.utc)
    if payload.hostname is not None:
        agent.hostname = payload.hostname
    if payload.capabilities is not None:
        agent.capabilities = payload.capabilities
    db.commit()
    db.refresh(agent)
    return agent


@router.post("/tasks/claim", response_model=AgentTaskClaim | None)
def claim_task(
    db: Annotated[Session, Depends(get_db)],
    agent: Annotated[Agent, Depends(get_current_agent)],
) -> AgentTaskClaim | None:
    task = (
        db.query(AgentTask)
        .filter(AgentTask.agent_id == agent.id, AgentTask.status == AgentTaskStatus.queued)
        .order_by(AgentTask.queued_at.asc())
        .with_for_update(skip_locked=True)
        .first()
    )
    if not task:
        return None
    now = datetime.now(timezone.utc)
    task.status = AgentTaskStatus.running
    task.claimed_at = now
    task.started_at = now
    agent.last_seen_at = now
    db.commit()
    db.refresh(task)
    return AgentTaskClaim.model_validate(task)


@router.post("/tasks/{task_id}/result", response_model=AgentTaskOut)
def report_task(
    task_id: int,
    report: AgentTaskReport,
    db: Annotated[Session, Depends(get_db)],
    agent: Annotated[Agent, Depends(get_current_agent)],
) -> AgentTask:
    task = db.query(AgentTask).filter(AgentTask.id == task_id, AgentTask.agent_id == agent.id).first()
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    if task.status not in (AgentTaskStatus.claimed, AgentTaskStatus.running):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Task is not in progress")
    if report.status not in (
        AgentTaskStatus.passed,
        AgentTaskStatus.failed,
        AgentTaskStatus.error,
        AgentTaskStatus.canceled,
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Report status must be terminal")
    task.status = report.status
    task.result = report.result
    if report.logs is not None:
        task.logs = report.logs
    task.error_message = report.error_message
    task.finished_at = datetime.now(timezone.utc)
    agent.last_seen_at = task.finished_at
    db.commit()
    db.refresh(task)
    return task


# ---------- User-facing agent task endpoints ----------

@tasks_router.get("/", response_model=list[AgentTaskOut])
def list_tasks(
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    agent_id: int | None = None,
    limit: int = 50,
) -> list[AgentTask]:
    q = (
        db.query(AgentTask)
        .join(Agent, Agent.id == AgentTask.agent_id)
        .filter(Agent.organization_id == org.id)
    )
    if agent_id is not None:
        q = q.filter(AgentTask.agent_id == agent_id)
    return q.order_by(AgentTask.queued_at.desc()).limit(min(limit, 200)).all()


@tasks_router.post("/", response_model=AgentTaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: AgentTaskCreate,
    db: Annotated[Session, Depends(get_db)],
    membership: Annotated[Membership, Depends(get_current_membership)],
) -> AgentTask:
    agent = (
        db.query(Agent)
        .filter(Agent.id == payload.agent_id, Agent.organization_id == membership.organization_id)
        .first()
    )
    if not agent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agent not found in this organization")
    task = AgentTask(
        agent_id=agent.id,
        kind=agent.kind,
        name=payload.name,
        payload=payload.payload,
        triggered_by_id=membership.user_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@tasks_router.get("/{task_id}", response_model=AgentTaskDetail)
def get_task(
    task_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> AgentTaskDetail:
    task = (
        db.query(AgentTask)
        .join(Agent, Agent.id == AgentTask.agent_id)
        .filter(AgentTask.id == task_id, Agent.organization_id == org.id)
        .first()
    )
    if not task:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return AgentTaskDetail(
        id=task.id,
        agent_id=task.agent_id,
        kind=task.kind,
        name=task.name,
        status=task.status,
        error_message=task.error_message,
        queued_at=task.queued_at,
        claimed_at=task.claimed_at,
        started_at=task.started_at,
        finished_at=task.finished_at,
        payload=task.payload or {},
        result=task.result,
        logs=task.logs or "",
        triggered_by=UserOut.model_validate(task.triggered_by) if task.triggered_by else None,
    )
