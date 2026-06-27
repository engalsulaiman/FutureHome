from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_org, require_admin
from ..models import Organization, Project, TestSuite
from ..schemas import SuiteCreate, SuiteOut, SuiteUpdate

router = APIRouter(prefix="/projects/{project_id}/suites", tags=["suites"])


def _get_project(db: Session, org: Organization, project_id: int) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == org.id)
        .first()
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def _get_suite(db: Session, org: Organization, project_id: int, suite_id: int) -> TestSuite:
    project = _get_project(db, org, project_id)
    suite = (
        db.query(TestSuite)
        .filter(TestSuite.id == suite_id, TestSuite.project_id == project.id)
        .first()
    )
    if not suite:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Suite not found")
    return suite


@router.get("/", response_model=list[SuiteOut])
def list_suites(
    project_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> list[TestSuite]:
    project = _get_project(db, org, project_id)
    return (
        db.query(TestSuite)
        .filter(TestSuite.project_id == project.id)
        .order_by(TestSuite.created_at.desc())
        .all()
    )


@router.post("/", response_model=SuiteOut, status_code=status.HTTP_201_CREATED)
def create_suite(
    project_id: int,
    payload: SuiteCreate,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    _admin=Depends(require_admin),
) -> TestSuite:
    project = _get_project(db, org, project_id)
    suite = TestSuite(
        project_id=project.id,
        name=payload.name,
        description=payload.description,
        command=payload.command,
        working_dir=payload.working_dir,
        env=payload.env,
        timeout_seconds=payload.timeout_seconds,
    )
    db.add(suite)
    db.commit()
    db.refresh(suite)
    return suite


@router.get("/{suite_id}", response_model=SuiteOut)
def get_suite(
    project_id: int,
    suite_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> TestSuite:
    return _get_suite(db, org, project_id, suite_id)


@router.patch("/{suite_id}", response_model=SuiteOut)
def update_suite(
    project_id: int,
    suite_id: int,
    payload: SuiteUpdate,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    _admin=Depends(require_admin),
) -> TestSuite:
    suite = _get_suite(db, org, project_id, suite_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(suite, field, value)
    db.commit()
    db.refresh(suite)
    return suite


@router.delete("/{suite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_suite(
    project_id: int,
    suite_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    _admin=Depends(require_admin),
) -> None:
    suite = _get_suite(db, org, project_id, suite_id)
    db.delete(suite)
    db.commit()
