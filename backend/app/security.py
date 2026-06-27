import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from .config import settings

AGENT_TOKEN_PREFIX = "agent_"


def _to_bytes(password: str) -> bytes:
    # bcrypt has a hard 72-byte input limit; trim before hashing.
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_to_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_to_bytes(password), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str, extra: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_expire_minutes)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    return _slug_re.sub("-", value.lower()).strip("-") or "n-a"


def generate_agent_token() -> str:
    return AGENT_TOKEN_PREFIX + secrets.token_urlsafe(32)


def hash_agent_token(token: str) -> str:
    # Opaque high-entropy tokens — a fast hash is sufficient and avoids bcrypt cost on every request.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
