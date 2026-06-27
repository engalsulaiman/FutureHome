from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_org, require_admin
from ..models import Organization, Project
from ..schemas import ProjectCreate, ProjectOut
from ..security import slugify

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectOut])
def list_projects(
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> list[Project]:
    return (
        db.query(Project)
        .filter(Project.organization_id == org.id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("/", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    _admin=Depends(require_admin),
) -> Project:
    slug = slugify(payload.name)
    existing = (
        db.query(Project)
        .filter(Project.organization_id == org.id, Project.slug == slug)
        .first()
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Project name already used")
    project = Project(
        organization_id=org.id,
        name=payload.name,
        slug=slug,
        description=payload.description,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == org.id)
        .first()
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Annotated[Session, Depends(get_db)],
    org: Annotated[Organization, Depends(get_current_org)],
    _admin=Depends(require_admin),
) -> None:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.organization_id == org.id)
        .first()
    )
    if not project:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    db.delete(project)
    db.commit()
