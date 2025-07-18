from pydantic import BaseModel
from typing import Optional


class ObjectsBase(BaseModel):
    type_id: int
    parent_id: Optional[int] = None

class ObjectsCreate(ObjectsBase):
    pass

class ObjectsUpdate(BaseModel):
    type_id: Optional[int] = None
    parent_id: Optional[int] = None

class ObjectsRead(ObjectsCreate):
    id: int
    index_of_layer: int
    root_id: int

    class Config:
        orm_mode = True
