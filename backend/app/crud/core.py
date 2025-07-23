from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import *
from app.schemas.core import *
from typing import List, Optional
from fastapi import HTTPException



############ Objects

#Get all of the available objects
async def get_objects(db: AsyncSession) -> List[Objects]:
    result = await db.execute(select(Objects))
    return result.scalars().all()

#Get one object using the object's id
async def get_object(db: AsyncSession, object_id: int) -> Optional[Objects]:
    result = await db.execute(select(Objects).where(Objects.id == object_id))
    return result.scalar_one_or_none()


#Create an object
async def create_object(db: AsyncSession, data: ObjectsCreate):
    #recieving parent, if parent_id is given
    index_of_layer = 1
    root_id = None

    #if parent_id present - getting the index of layer and adding 1, root = parent.root
    if data.parent_id:
        parent_obj = await db.get(Objects, data.parent_id)
        if not parent_obj:
            raise HTTPException(status_code=404, detail="Parent object not found")
        
        index_of_layer = parent_obj.index_of_layer + 1
        root_id = parent_obj.root_id
    
    #checking if type exists
    type_obj = await db.get(Types, data.type_id)
    if not type_obj:
        raise HTTPException(status_code=404, detail="Type not found")

    obj = Objects(
        **data.dict(),
        index_of_layer=index_of_layer,
        root_id=root_id
    )

    db.add(obj)
    await db.flush() # flushing in order to prevent data corruption (and null root_id)

    if data.parent_id is None:
        obj.root_id = obj.id
        await db.flush()
    
    await db.commit()
    await db.refresh(obj)
    
    return obj





############ Types

#Get all of the available types
async def get_types(db: AsyncSession) -> List[Types]:
    result = await db.execute(select(Types))
    return result.scalars().all()

#Get one type using the types's id
async def get_type(db: AsyncSession, type_id: int) -> Optional[Types]:
    result = await db.execute(select(Types).where(Types.id == type_id))
    return result.scalar_one_or_none()


#Create a type
async def create_type(db: AsyncSession, data: TypesCreate):
    #recieving parent, if parent_id is given
    index_of_layer = 1
    root_id = None

    #if parent_id present - getting the index of layer and adding 1, root = parent.root
    if data.parent_id:
        parent_type = await db.get(Types, data.parent_id)
        if not parent_type:
            raise HTTPException(status_code=404, detail="Parent type not found")
        
        index_of_layer = parent_type.index_of_layer + 1
        root_id = parent_type.root_id

    type_ = Types(
        **data.dict(),
        index_of_layer=index_of_layer,
        root_id=root_id
    )

    db.add(type_)
    await db.flush() # flushing in order to prevent data corruption (and null root_id)

    if data.parent_id is None:
        type_.root_id = type_.id
        await db.flush()
    
    await db.commit()
    await db.refresh(type_)
    
    return type_


######## PropertyTypes    

#Get all of the available property types
async def get_propertytypes(db: AsyncSession) -> List[PropertyTypes]:
    result = await db.execute(select(PropertyTypes))
    return result.scalars().all()

#Get one type using the property types' id
async def get_propertytype(db: AsyncSession, propertytype_id: int) -> Optional[PropertyTypes]:
    result = await db.execute(select(PropertyTypes).where(PropertyTypes.id == propertytype_id))
    return result.scalar_one_or_none()

#Create a property type
async def create_propertytype(db: AsyncSession, data: PropertyTypesCreate):
    
    
    type_ident = await db.get(Types, data.type_id)
    if not data.type_id:
            raise HTTPException(status_code=404, detail="Type id not found")

    property_type = PropertyTypes(**data.dict())

    db.add(property_type)
    
    await db.commit()
    await db.refresh(property_type)
    
    return property_type



######## Propreties   

#Get all of the available properties
async def get_properties(db: AsyncSession) -> List[Properties]:
    result = await db.execute(select(Properties))
    return result.scalars().all()

#Get one type using the property's id
async def get_property(db: AsyncSession, property_id: int) -> Optional[Properties]:
    result = await db.execute(select(Properties).where(Properties.id == property_id))
    return result.scalar_one_or_none()

#Create a property
async def create_property(db: AsyncSession, data: PropertiesCreate):

    property_type = await db.get(PropertyTypes, data.property_id)
    if not property_type:
        raise HTTPException(status_code = 404, detail="Property type not found")

    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code = 404, detail="Object not found")

    property_ = Properties(**data.dict())

    db.add(property_)
    
    await db.commit()
    await db.refresh(property_)
    
    return property_


######## Instances  

#Get all of the available instances
async def get_instances(db: AsyncSession) -> List[Instances]:
    result = await db.execute(select(Instances))
    return result.scalars().all()

#Get one type using the instances's id
async def get_instance(db: AsyncSession, instance_id: int) -> Optional[Instances]:
    result = await db.execute(select(Instances).where(Instances.id == instance_id))
    return result.scalar_one_or_none()

#Create an instances
async def create_instance(db: AsyncSession, data: InstancesCreate):

    obj = await db.get(Objects, data.object_id)
    if not obj:
        raise HTTPException(status_code = 404, detail="Object not found")

    instance = Instances(
        **data.dict(),
        type_id=obj.type_id
        )

    db.add(instance)
    
    await db.commit()
    await db.refresh(instance)
    
    return instance


######## Instance Properties   

#Get all of the available instance properties
async def get_instanceproperties(db: AsyncSession) -> List[InstanceProperties]:
    result = await db.execute(select(InstanceProperties))
    return result.scalars().all()

#Get one type using the properties id
async def get_instanceproperty(db: AsyncSession, instanceproperty_id: int) -> Optional[InstanceProperties]:
    result = await db.execute(select(InstanceProperties).where(InstanceProperties.id == instanceproperty_id))
    return result.scalar_one_or_none()

#Create an instance property
async def create_instanceproperty(db: AsyncSession, data: InstancePropertiesCreate):
    
    
    instance_ident = await db.get(Instances, data.instance_id)
    if not instance_ident:
            raise HTTPException(status_code=404, detail="Instance id not found")

    instance_property = InstanceProperties(**data.dict())

    db.add(instance_property)
    
    await db.commit()
    await db.refresh(instance_property)
    
    return instance_property

