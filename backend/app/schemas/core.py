from pydantic import BaseModel
from typing import Optional, List


#Objects
class ObjectsBase(BaseModel):
    name: Optional[str] = None
    type_id: int
    parent_id: Optional[int] = None

class ObjectsCreate(ObjectsBase):
    pass

class ObjectsUpdate(BaseModel):
    name: Optional[str] = None
    type_id: Optional[int] = None
    parent_id: Optional[int] = None

class ObjectsRead(ObjectsBase):
    id: int
    index_of_layer: int
    root_id: int

    class Config:
        from_attributes = True

class ObjectsDelete(BaseModel):
    id: int


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
        from_attributes = True

class TypesDelete(BaseModel):
    id: int

#PropertyTypes
class PropertyTypesBase(BaseModel):
    type_id: int
    name: str
    is_static: bool

class PropertyTypesCreate(PropertyTypesBase):
    pass

class PropertyTypesUpdate(BaseModel):
    type_id: Optional[int] = None
    name: Optional[int] = None
    is_static: Optional[bool] = None
 
class PropertyTypesRead(PropertyTypesBase):
    id: int

    class Config:
        from_attributes = True

class PropertyTypesDelete(BaseModel):
    id: int



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
        from_attributes = True
class PropertiesDelete(BaseModel):
    id: int


#Instances

class InstancesBase(BaseModel):
    name: Optional[str] = None
    object_id: int
    is_active: bool

class InstancesCreate(InstancesBase):
    tree_id: int

class InstanceCreated(BaseModel):
    id: int
    name: Optional[str] = None
    object_id: int
    is_active: bool

class InstancesUpdate(BaseModel):
    name: Optional[int] = None
    object_id: Optional[int] = None
    is_active: Optional[bool] = None

class InstancesRead(BaseModel):
    id: int
    name: Optional[str] = None
    object_id: int
    is_active: bool
    tree_id: int

    class Config:
        from_attributes = True

class InstancesDelete(BaseModel):
    id: int

#Instance Properties

class InstancePropertiesBase(BaseModel):
    value: str
    instance_id: int
    property_type_id: int

class InstancePropertiesCreate(InstancePropertiesBase):
    pass

class InstancePropertiesUpdate(BaseModel):
    value: Optional[str] = None
    instance_id: Optional[int] = None
    property_type_id: Optional[int] = None

class InstancePropertiesRead(InstancePropertiesBase):
    id: int

    class Config:
        from_attributes = True

class InstancePropertiesDelete(BaseModel):
    id: int

#InstanceTreeMap
class InstanceTreeMapBase(BaseModel):
    tree_id: int
    instance_id: int
    is_active: bool

class InstanceTreeMapCreate(InstanceTreeMapBase):
    pass

class InstanceTreeMapUpdate(InstanceTreeMapBase):
    tree_id: Optional[int] = None
    instance_id: Optional[int] = None
    is_active: Optional[int] = None

class InstanceTreeMapRead(InstanceTreeMapBase):
    id: int

    class Config:
        from_attributes = True

#DataTree

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

ObjectNode.update_forward_refs()

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

ObjectInstanceTree.update_forward_refs()




