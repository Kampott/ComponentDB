from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import UserCreate, UserOut, Token, TokenRefresh
from app.crud.auth.auth import create_user, authenticate_user, create_tokens, verify_and_rotate_refresh_token

router = APIRouter(prefix="/auth", tags=["auth"])


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session


@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, session: AsyncSession = Depends(get_session)):
    user = await create_user(session, user_in)
    return user


@router.post("/login", response_model=Token)
async def login(form_data: UserCreate, session: AsyncSession = Depends(get_session)):
    user = await authenticate_user(session, form_data.email, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    tokens = await create_tokens(session, user)
    return {**tokens, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
async def refresh(token_in: TokenRefresh, session: AsyncSession = Depends(get_session)):
    tokens = await verify_and_rotate_refresh_token(session, token_in.refresh_token)
    if not tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    return {**tokens, "token_type": "bearer"}
