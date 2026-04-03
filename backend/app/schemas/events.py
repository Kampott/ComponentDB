from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# EventTypes
class EventTypesBase(BaseModel):
    name: str
    counts_as_failure: bool = False

class EventTypesCreate(EventTypesBase):
    pass

class EventTypesUpdate(BaseModel):
    name: Optional[str] = None
    counts_as_failure: Optional[bool] = None 

class EventTypesRead(EventTypesBase):
    id: int
    
    class Config:
        from_attributes = True


# EventTypesTypes (M2M relationship)
class EventTypesTypesBase(BaseModel):
    event_type_id: int
    type_id: int

class EventTypesTypesCreate(EventTypesTypesBase):
    pass

class EventTypesTypesRead(EventTypesTypesBase):
    class Config:
        from_attributes = True


# Events
class EventsBase(BaseModel):
    event_type_id: int
    instance_id: int
    info: Optional[dict[str, object]] = None
    timestamp: datetime

class EventsCreate(EventsBase):
    pass

class EventsUpdate(BaseModel):
    event_type_id: int | None = None
    instance_id: int | None = None
    info: Optional[dict[str, object]] = None
    timestamp: datetime | None = None

class EventsRead(EventsBase):
    id: int

    class Config:
        from_attributes = True


# Replacements
class ReplacementsBase(BaseModel):
    event_id: int
    new_instance_id: int

class ReplacementsCreate(ReplacementsBase):
    pass

class ReplacementsRead(ReplacementsBase):
    class Config:
        from_attributes = True
