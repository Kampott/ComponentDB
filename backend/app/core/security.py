from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.future import select
from app.db.database import get_async_session
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid


import os


from .config import settings
# Configuring password hash
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Path from endpoint to login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Secret and algorithm for JWT
SECRET_KEY = settings.secret_key  # better store in .env
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days


async def get_current_user(db: AsyncSession = Depends(get_async_session), token: str = Depends(oauth2_scheme)):
    from app.models.auth import User
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_raw = payload.get("sub")
        if not isinstance(user_id_raw, str):
            raise credentials_exception
        user_id_str = user_id_raw
        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise credentials_exception
    return user

# ---------------- Пароли ----------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checking for hashed password"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generating bcrypt-hash"""
    return pwd_context.hash(password)


# ---------------- JWT ----------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode and isinstance(to_encode["sub"], uuid.UUID):
        to_encode["sub"] = str(to_encode["sub"])  # Ensure sub is str (hex if UUID)
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict[str, Any]) -> dict[str, Any]:
    """Creating refresh token"""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    jti_uuid = uuid.uuid4()
    jti = str(jti_uuid)  # refresh token uuid as str
    to_encode = data.copy()
    if "sub" in to_encode and isinstance(to_encode["sub"], uuid.UUID):
        to_encode["sub"] = str(to_encode["sub"])
    to_encode.update({"exp": expire, "scope": "refresh_token", "sub": to_encode["sub"], "jti": jti})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "jti": jti_uuid, "expires_at": expire}


def decode_token(token: str) -> dict[str, Any] | None:
    """Decoding token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
