from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.future import select
from app.db.session import async_session
from app.db.database import get_async_session
from app.models.auth import User
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


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
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
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
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "sub": str(data["sub"])})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Creating refresh token"""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    jti = str(uuid.uuid4()) #refresh token uuid
    to_encode = data.copy()
    to_encode.update({"exp": expire, "scope": "refresh_token", "sub": str(data["sub"]), "jti": jti})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token, "jti": jti, "expires_at": expire}


def decode_token(token: str) -> dict:
    """Decoding token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
