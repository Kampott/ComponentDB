from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import TypeTree, ObjectNode, ObjectInstanceTree, ObjectsRead, TypesRead
from app.crud.core.data_manip import *
from app.db.database import get_async_session
from app.core.security import get_current_user
from app.models.auth import User
from app.crud.auth.auth import require_permission as require_permissions


router = APIRouter(prefix="/data-manip", tags=["DB: Core: Data Manipulation"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")



@router.get("/root-objects", response_model=List[ObjectsRead])
async def list_root_objects(db: AsyncSession = Depends(get_async_session), _: User = Depends(get_current_user), __: None = Depends(require_permissions("read_root_objects"))):
    return await get_root_objects(db)

@router.get("/root-types", response_model=List[TypesRead])
async def list_root_types(db: AsyncSession = Depends(get_async_session), _: User = Depends(get_current_user), __: None = Depends(require_permissions("read_root_types"))):
    return await get_root_types(db)

@router.get("/type-tree/{root_id}", response_model=TypeTree)
async def get_type_hierarchy(root_id: int, db: AsyncSession = Depends(get_async_session), _: User = Depends(get_current_user), __: None = Depends(require_permissions("read_type_tree"))):
    tree = await get_type_tree(db, root_id)
    if tree is None:
        raise HTTPException(status_code=404, detail="Root type not found")
    return tree

@router.get("/type-trees", response_model=List[TypeTree])
async def get_all_types_hierarchy(db: AsyncSession = Depends(get_async_session), _: User = Depends(get_current_user), __: None = Depends(require_permissions("read_type_trees"))):
    tree = await get_all_type_hierarchies(db)
    return tree

@router.get("/object-tree/{root_id}", response_model=ObjectNode)
async def get_object_hierarchy(root_id: int, db: AsyncSession = Depends(get_async_session), _: User = Depends(get_current_user), __: None = Depends(require_permissions("read_object_tree"))):
    return await get_object_tree(db, root_id)

@router.get("/object-trees", response_model=List[ObjectNode])
async def get_all_objects_hierarchy(db: AsyncSession = Depends(get_async_session), _: User = Depends(get_current_user), __: None = Depends(require_permissions("read_object_trees"))):
    tree = await get_all_object_hierarchies(db)
    return tree
