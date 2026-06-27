from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import Role, RunStatus


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = None
    organization_name: str = Field(min_length=2, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str | None


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    organization: OrganizationOut
    role: Role


class Me(BaseModel):
    user: UserOut
    memberships: list[MembershipOut]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    description: str | None
    created_at: datetime


class SuiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    command: str = Field(min_length=1)
    working_dir: str | None = None
    env: dict[str, str] = Field(default_factory=dict)
    timeout_seconds: int = Field(default=600, ge=1, le=24 * 3600)


class SuiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    command: str | None = Field(default=None, min_length=1)
    working_dir: str | None = None
    env: dict[str, str] | None = None
    timeout_seconds: int | None = Field(default=None, ge=1, le=24 * 3600)


class SuiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    name: str
    description: str | None
    command: str
    working_dir: str | None
    env: dict[str, str]
    timeout_seconds: int
    created_at: datetime


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    suite_id: int
    status: RunStatus
    exit_code: int | None
    error_message: str | None
    queued_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class RunDetail(RunOut):
    logs: str
    triggered_by: UserOut | None
