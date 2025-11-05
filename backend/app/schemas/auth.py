from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
import uuid



## Login + Authorization

class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


## Permission

class PermissionCreate(BaseModel):
    name: str
    description: str

class PermissionOut(PermissionCreate):
    id: int

class PermissionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


## Role

class RoleCreate(BaseModel):
    name: str
    description: str

class RoleOut(RoleCreate):
    id: int

class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


##User Role

class UserRoleCreate(BaseModel):
    user_id: uuid.UUID
    role_id: int

class UserRoleOut(BaseModel):
    user_id: uuid.UUID
    role_id: int


## Role Permission


class RolePermissionCreate(BaseModel):
    role_id: int
    permission_id: int

class RolePermissionOut(BaseModel):
    role_id: int
    permission_id: int

