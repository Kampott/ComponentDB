from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.core import TypeTree, ObjectNode, ObjectInstanceTree
from app.crud.core.data_manip import get_type_tree, get_all_type_hierarchies, get_object_tree, get_all_object_hierarchies
from app.db.database import get_async_session


router = APIRouter(prefix="/data-manip", tags=["DB: Core: Data Manipulation"])



@router.get("/type-tree/{root_id}", response_model=TypeTree)
async def get_type_hierarchy(root_id: int, db: AsyncSession = Depends(get_async_session)):
    tree = await get_type_tree(db, root_id)
    if tree is None:
        raise HTTPException(status_code=404, detail="Root type not found")
    return tree


@router.get("/type-trees", response_model=List[TypeTree])
async def get_all_types_hierarchy(db: AsyncSession = Depends(get_async_session)):
    tree = await get_all_type_hierarchies(db)
    return tree

@router.get("/object-tree/{root_id}", response_model=ObjectNode)
async def get_object_hierarchy(root_id: int, db: AsyncSession = Depends(get_async_session)):
    return await get_object_tree(db, root_id)

@router.get("/object-trees", response_model=List[ObjectNode])
async def get_all_objects_hierarchy(db: AsyncSession = Depends(get_async_session)):
    tree = await get_all_object_hierarchies(db)
    return tree
