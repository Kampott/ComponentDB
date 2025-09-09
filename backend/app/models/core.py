from sqlalchemy.orm import Mapped, mapped_column, relationship, backref
from app.db.database import Base
from sqlalchemy import Index, text, UniqueConstraint
from typing import Optional, List
from sqlalchemy import ForeignKey, String, Integer, Boolean


class Types(Base):
    __tablename__ = "types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String)

    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"))
    parent: Mapped[Optional["Types"]] = relationship(
        "Types",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref=backref("children", passive_deletes=True),
        passive_deletes=True
        )

    root_id: Mapped[int] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"), nullable = True)
    root: Mapped["Types"] = relationship(
        "Types",
        foreign_keys=[root_id], 
        remote_side=[id],
        backref=backref("root_children", passive_deletes=True),
        passive_deletes=True
        )

    index_of_layer: Mapped[int]

class Objects(Base):
    __tablename__ = "objects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[Optional[str]] = mapped_column(String)

    type_id: Mapped[int] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"))
    type_: Mapped["Types"] = relationship("Types", remote_side="Types.id", passive_deletes=True)

    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"))
    parent: Mapped[Optional["Objects"]] = relationship(
        "Objects",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref=backref("children", passive_deletes=True),
        passive_deletes=True
        )  


    root_id: Mapped[int] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"), nullable=True)
    root: Mapped["Objects"] = relationship(
        "Objects",
        foreign_keys=[root_id],
        remote_side=[id],
        backref=backref("root_children", passive_deletes=True),
        passive_deletes=True
    )
    index_of_layer: Mapped[int]


    instances: Mapped[List["Instances"]] = relationship(
    "Instances",
    back_populates="object_",
    cascade="all, delete-orphan"
)

class Properties(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    property_id: Mapped[int] = mapped_column(ForeignKey("property_types.id", ondelete="CASCADE"))
    property: Mapped["PropertyTypes"] = relationship("PropertyTypes", passive_deletes=True)


    value: Mapped[str] = mapped_column(String)

    object_id: Mapped[int] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"))
    object_: Mapped["Objects"] = relationship("Objects", passive_deletes=True)

class PropertyTypes(Base):
    __tablename__ = "property_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    type_id: Mapped[int] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"))
    type_: Mapped["Types"] = relationship("Types", passive_deletes=True)

    name: Mapped[str] = mapped_column(String, nullable = False)

    is_static: Mapped[bool] = mapped_column(nullable = False)


class Instances(Base):
    __tablename__ = "instances"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String)

    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"), index=True)
    parent: Mapped[Optional["Instances"]] = relationship(
        "Instances",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref=backref("children", passive_deletes=True),
        passive_deletes=True
        )

    root_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"), nullable = True)
    root: Mapped["Instances"] = relationship(
        "Instances",
        foreign_keys=[root_id], 
        remote_side=[id],
        backref=backref("root_children", passive_deletes=True),
        passive_deletes=True
        )

    object_id: Mapped[int] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"))
    object_: Mapped["Objects"] = relationship("Objects", back_populates="instances", passive_deletes=True)

    is_active: Mapped[bool] = mapped_column(nullable=False)
    index_of_layer: Mapped[int] = mapped_column(Integer)


class InstanceProperties(Base): 
    __tablename__ = "instance_properties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    value: Mapped[str] = mapped_column(String)

    instance_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"))
    instance: Mapped["Instances"] = relationship("Instances", passive_deletes=True)

    property_type_id: Mapped[int] = mapped_column(ForeignKey("property_types.id", ondelete="CASCADE"))
    property_type: Mapped["PropertyTypes"] = relationship("PropertyTypes", passive_deletes=True)



