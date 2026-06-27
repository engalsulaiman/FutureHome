from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Membership, Organization, Role, User
from ..schemas import Me, MembershipOut, Token, UserLogin, UserOut, UserRegister
from ..security import create_access_token, hash_password, slugify, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Annotated[Session, Depends(get_db)]) -> Token:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    org_slug = slugify(payload.organization_name)
    if db.query(Organization).filter(Organization.slug == org_slug).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Organization name unavailable")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )
    org = Organization(name=payload.organization_name, slug=org_slug)
    db.add(user)
    db.add(org)
    db.flush()
    db.add(Membership(user_id=user.id, organization_id=org.id, role=Role.owner))
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(str(user.id)))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Annotated[Session, Depends(get_db)]) -> Token:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=Me)
def me(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Me:
    memberships = db.query(Membership).filter(Membership.user_id == user.id).all()
    return Me(
        user=UserOut.model_validate(user),
        memberships=[MembershipOut.model_validate(m) for m in memberships],
    )
