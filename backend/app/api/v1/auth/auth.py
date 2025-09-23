from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session
from app.schemas.auth import UserCreate, UserOut, Token, TokenRefresh
from app.crud.auth.auth import create_tokens, verify_and_rotate_refresh_token
from app.crud.auth.users import create_user, authenticate_user
from app.db.database import get_async_session

router = APIRouter(prefix="/auth", tags=["DB: Auth: Auth + Tokens"])



@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_async_session)):
    user = await create_user(db, user_in)
    if not user:
        raise HTTPException(status_code=400, detail="User could not be created")
    return user


@router.post("/login", response_model=Token)
async def login(form_data: UserCreate, db: AsyncSession = Depends(get_async_session)):
    user = await authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    tokens = await create_tokens(db, user)
    return {**tokens, "token_type": "bearer"}


@router.post("/refresh", response_model=Token)
async def refresh(token_in: TokenRefresh, db: AsyncSession = Depends(get_async_session)):
    tokens = await verify_and_rotate_refresh_token(db, token_in.refresh_token)
    if not tokens:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    return {**tokens, "token_type": "bearer"}
