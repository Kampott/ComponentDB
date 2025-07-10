from pydantic import BaseModel

class ObjectsCreate(BaseModel):
    name: str

class ObjectsRead(ObjectsCreate):
    id: int
    class Config:
        orm_mode = True
