from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base
from typing import Optional, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, String, Integer, Boolean

class Objects(Base):
    __tablename__ = "objects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    type_id: Mapped[int] = mapped_column(ForeignKey("types.id"))
    type_: Mapped["Types"] = relationship("Types", remote_side="Types.id")

    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("objects.id"))
    parent: Mapped[Optional["Objects"]] = relationship(
        "Objects",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref="children"
        )  

    root_id: Mapped[int] = mapped_column(ForeignKey("objects.id"))
    root: Mapped["Objects"] = relationship(
        "Objects",
        foreign_keys=[root_id],
        remote_side=[id]
    )
    index_of_layer: Mapped[int]

class Types(Base):
    __tablename__ = "types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String)

    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("types.id"))
    parent: Mapped[Optional["Types"]] = relationship(
        "Types",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref="children"
        )

    root_id: Mapped[int] = mapped_column(ForeignKey("types.id"))
    root: Mapped["Types"] = relationship(
        "Types",
        foreign_keys=[root_id], 
        remote_side=[id]
        )

    index_of_layer: Mapped[int]

class Properties(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    property_id: Mapped[int] = mapped_column(ForeignKey("property_types.id"))
    property: Mapped["PropertyTypes"] = relationship("PropertyTypes")


    value: Mapped[str] = mapped_column(String)

    object_id: Mapped[int] = mapped_column(ForeignKey("objects.id"))
    object_: Mapped["Objects"] = relationship("Objects")

class PropertyTypes(Base):
    __tablename__ = "property_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    id_type: Mapped[int] = mapped_column(ForeignKey("types.id"))
    type_: Mapped["Types"] = relationship("Types")

    name: Mapped[str] = mapped_column(String, nullable = False)


class Instances(Base):
    __tablename__ = "instances"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    type_id: Mapped[int] = mapped_column(ForeignKey("types.id")) # нужна ли связь
    type_: Mapped["Types"] = relationship("Types") # ??

    object_id: Mapped[int] = mapped_column(ForeignKey("objects.id"))
    object_: Mapped["Objects"] = relationship("Objects")

    is_active: Mapped[bool]


class InstanceProperties(Base): # зачем?
    __tablename__ = "instance_properties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    value: Mapped[str] = mapped_column(String)

    instance_id: Mapped[int] = mapped_column(ForeignKey("instances.id"))
    instance: Mapped["Instances"] = relationship("Instances")