from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordBearer
from app.schemas.auth import UserCreate, UserOut, Token, TokenRefresh, TokenOut
from app.crud.auth.auth import create_tokens, verify_and_rotate_refresh_token
from app.crud.auth.users import create_user, authenticate_user
from app.db.database import get_async_session
from fastapi.security import OAuth2PasswordRequestForm
import uuid
from app.crud.auth.auth import require_permission as require_permissions
from app.models.auth import User
from app.logging.deps import LoggerInterface, LogCallable
import typing

router = APIRouter(prefix="/auth", tags=["DB: Auth: Auth + Tokens"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

@router.post("/register", response_model=UserOut)
async def register(
    user_in: UserCreate,
    current_user: User = Depends(require_permissions("register_user")),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("auth"))
):
    user = await create_user(db, user_in)
    if not user:
        raise HTTPException(status_code=400, detail="User could not be created")
    try:
        await log(
            action="register",
            details={
                "created_user_id": str(user.id),
                "created_user_email": user.email
            }
        )
    except Exception:
        pass
    return user

@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("auth"))
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    tokens = await create_tokens(db, user)

    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=60 * 60 * 24 * 7
    )

    try:
        await log(action="login", details={"user_email": user.email})
    except Exception:
        pass

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenOut)
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_async_session),
    log: LogCallable = Depends(LoggerInterface("auth"))
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token provided")

    tokens = await verify_and_rotate_refresh_token(db, refresh_token)
    if not tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=60 * 60 * 24 * 7
    )

    try:
        await log(action="refresh_token")
    except Exception:
        pass

    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    response: Response,
    log: LogCallable = Depends(LoggerInterface("auth"))
):
    response.delete_cookie("refresh_token")
    try:
        await log(action="logout")
    except Exception:
        pass
    return {"detail": "Logged out successfully"}