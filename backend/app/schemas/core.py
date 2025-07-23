from pydantic import BaseModel
from typing import Optional


#Objects
class ObjectsBase(BaseModel):
    type_id: int
    parent_id: Optional[int] = None

class ObjectsCreate(ObjectsBase):
    pass

class ObjectsUpdate(BaseModel):
    type_id: Optional[int] = None
    parent_id: Optional[int] = None

class ObjectsRead(ObjectsBase):
    id: int
    index_of_layer: int
    root_id: int

    class Config:
        from_attribues = True


#Types
class TypesBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class TypesCreate(TypesBase):
    pass

class TypesUpdate(TypesBase):
    name: Optional[str] = None
    parent_id: Optional[int] = None

class TypesRead(TypesBase):
    id: int
    index_of_layer: int
    root_id: int

    class Config:
        from_attribues = True


#PropertyTypes
class PropertyTypesBase(BaseModel):
    type_id: int
    name: str

class PropertyTypesCreate(PropertyTypesBase):
    pass

class PropertyTypesUpdate(BaseModel):
    type_id: Optional[int] = None
    name: Optional[int] = None
 
class PropertyTypesRead(PropertyTypesBase):
    id: int

    class Config:
        from_attribues = True



#Properties
class PropertiesBase(BaseModel):
    property_id: int
    value: str
    object_id: int

class PropertiesCreate(PropertiesBase):
    pass

class PropertiesUpdate(BaseModel):
    property_id: Optional[int] = None
    value: Optional[str] = None
    object_id: Optional[str] = None

class PropertiesRead(PropertiesBase):
    id: int

    class Config:
        from_attribues = True


#Instances
class InstancesBase(BaseModel):
    object_id: int
    is_active: bool

class InstancesCreate(InstancesBase):
    pass

class InstancesUpdate(BaseModel):
    object_id: Optional[int] = None
    type_id: Optional[int] = None
    is_active: Optional[bool] = None

class InstancesRead(InstancesBase):
    id: int
    type_id: int

    class Config:
        from_attribues = True

#Instance Properties

class InstancePropertiesBase(BaseModel):
    value: str
    instance_id: int

class InstancePropertiesCreate(InstancePropertiesBase):
    pass

class InstancePropertiesUpdate(BaseModel):
    value: Optional[str] = None
    instance_id: Optional[int] = None

class InstancePropertiesRead(InstancePropertiesBase):
    id: int

    class Config:
        from_attribues = True