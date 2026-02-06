from pydantic import BaseModel
from typing import Optional, List


# Objects
class ObjectsBase(BaseModel):
    name: str | None = None
    type_id: int
    parent_id: int | None = None


class ObjectsCreate(ObjectsBase):
    pass


class ObjectsUpdate(BaseModel):
    name: str | None = None
    type_id: int | None = None


class ObjectsRead(ObjectsBase):
    id: int
    root_id: int

    class Config:
        from_attributes = True


# Types
class TypesBase(BaseModel):
    name: str
    parent_id: int | None = None


class TypesCreate(TypesBase):
    pass


class TypesUpdate(BaseModel):
    name: str | None = None


class TypesRead(TypesBase):
    id: int
    root_id: int

    class Config:
        from_attributes = True


# PropertyTypes
class PropertyTypesBase(BaseModel):
    type_id: int
    name: str
    is_static: bool


class PropertyTypesCreate(PropertyTypesBase):
    pass


class PropertyTypesUpdate(BaseModel):
    name: int | None = None
    is_static: bool | None = None


class PropertyTypesRead(PropertyTypesBase):
    id: int

    class Config:
        from_attributes = True


# Properties
class PropertiesBase(BaseModel):
    property_id: int
    value: str
    object_id: int


class PropertiesCreate(PropertiesBase):
    pass


class PropertiesUpdate(BaseModel):
    value: str | None = None


class PropertiesRead(PropertiesBase):
    id: int

    class Config:
        from_attributes = True


# Instances
class InstancesBase(BaseModel):
    name: str | None = None
    object_id: int
    parent_id: int | None = None
    is_active: bool


class InstancesCreate(InstancesBase):
    pass

class InstanceCreated(BaseModel):
    id: int
    name: str | None = None
    object_id: int
    parent_id: int | None = None
    root_id: int
    is_active: bool

class InstancesUpdate(BaseModel):
    name: int | None = None
    is_active: bool | None = None


class InstancesRead(BaseModel):
    id: int
    name: str | None = None
    root_id: int
    parent_id: int | None = None
    object_id: int
    is_active: bool

    class Config:
        from_attributes = True


# Instance Properties
class InstancePropertiesBase(BaseModel):
    value: str
    instance_id: int
    property_type_id: int


class InstancePropertiesCreate(InstancePropertiesBase):
    pass


class InstancePropertiesUpdate(BaseModel):
    value: str | None = None


class InstancePropertiesRead(InstancePropertiesBase):
    id: int

    class Config:
        from_attributes = True


# DataTree
class TypeTree(BaseModel):
    id: int
    name: str
    children: List["TypeTree"] = []

    class Config:
        from_attributes = True


class ObjectNode(BaseModel):
    id: int
    type_id: int
    type_name: str
    children: List["ObjectNode"] = []

    class Config:
        from_attributes = True


ObjectNode.model_rebuild()


class InstanceOut(BaseModel):
    id: int
    type_id: int
    type_name: str
    is_active: bool

    class Config:
        from_attributes = True


class ObjectInstanceTree(BaseModel):
    id: int
    type_id: int
    type_name: str
    instances: List[InstanceOut]
    children: List["ObjectInstanceTree"]

    class Config:
        from_attributes = True


ObjectInstanceTree.model_rebuild()
