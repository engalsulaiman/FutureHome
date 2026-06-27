from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from .database import get_db
from .models import Agent, Membership, Organization, Role, User
from .security import decode_token, hash_agent_token


def _bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    token = _bearer_token(authorization)
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def get_current_membership(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    x_organization_id: Annotated[int | None, Header()] = None,
) -> Membership:
    q = db.query(Membership).filter(Membership.user_id == user.id)
    if x_organization_id is not None:
        membership = q.filter(Membership.organization_id == x_organization_id).first()
    else:
        membership = q.first()
    if not membership:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No membership for this organization")
    return membership


def require_admin(membership: Annotated[Membership, Depends(get_current_membership)]) -> Membership:
    if membership.role not in (Role.owner, Role.admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return membership


def get_current_org(membership: Annotated[Membership, Depends(get_current_membership)]) -> Organization:
    return membership.organization


def get_current_agent(
    db: Annotated[Session, Depends(get_db)],
    x_agent_token: Annotated[str | None, Header()] = None,
) -> Agent:
    if not x_agent_token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-Agent-Token header")
    agent = db.query(Agent).filter(Agent.token_hash == hash_agent_token(x_agent_token)).first()
    if not agent:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown agent token")
    return agent
