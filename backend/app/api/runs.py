from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_membership, get_current_org
from ..models import Membership, Organization, Project, RunStatus, TestRun, TestSuite, User
from ..runner import execute_run
from ..schemas import RunDetail, RunOut, UserOut

router = APIRouter(prefix="/runs", tags=["runs"])


def _suite_in_org(db: Session, org: Organization, suite_id: int) -> TestSuite:
    suite = (
        db.query(TestSuite)
        .join(Project, Project.id == TestSuite.project_id)
        .filter(TestSuite.id == suite_id, Project.organization_id == org.id)
        .first()
    )
    if not suite:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suite not found in this organization")
    return suite


def _run_in_org(db: Session, org: Organization, run_id: int) -> TestRun:
    run = (
        db.query(TestRun)
        .join(TestSuite, TestSuite.id == TestRun.suite_id)
        .join(Project, Project.id == TestSuite.project_id)
        .filter(TestRun.id == run_id, Project.organization_id == org.id)
        .first()
    )
    if not run:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Run not found")
    return run


@router.get("/", response_model=list[RunOut])
def list_runs(
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    suite_id: int | None = None,
    limit: int = 50,
) -> list[TestRun]:
    q = (
        db.query(TestRun)
        .join(TestSuite, TestSuite.id == TestRun.suite_id)
        .join(Project, Project.id == TestSuite.project_id)
        .filter(Project.organization_id == org.id)
    )
    if suite_id is not None:
        q = q.filter(TestRun.suite_id == suite_id)
    return q.order_by(TestRun.queued_at.desc()).limit(min(limit, 200)).all()


@router.post("/", response_model=RunOut, status_code=status.HTTP_201_CREATED)
def trigger_run(
    suite_id: int,
    background: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    membership: Annotated[Membership, Depends(get_current_membership)],
) -> TestRun:
    suite = _suite_in_org(db, membership.organization, suite_id)
    run = TestRun(
        suite_id=suite.id,
        triggered_by_id=membership.user_id,
        status=RunStatus.pending,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    background.add_task(execute_run, run.id)
    return run


@router.get("/{run_id}", response_model=RunDetail)
def get_run(
    run_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> RunDetail:
    run = _run_in_org(db, org, run_id)
    triggered_by = db.get(User, run.triggered_by_id) if run.triggered_by_id else None
    return RunDetail(
        id=run.id,
        suite_id=run.suite_id,
        status=run.status,
        exit_code=run.exit_code,
        error_message=run.error_message,
        queued_at=run.queued_at,
        started_at=run.started_at,
        finished_at=run.finished_at,
        logs=run.logs or "",
        triggered_by=UserOut.model_validate(triggered_by) if triggered_by else None,
    )


@router.post("/{run_id}/cancel", response_model=RunOut)
def cancel_run(
    run_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> TestRun:
    run = _run_in_org(db, org, run_id)
    if run.status not in (RunStatus.pending, RunStatus.running):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Run is not cancellable")
    run.status = RunStatus.canceled
    db.commit()
    db.refresh(run)
    return run
