from typing import List, Optional

from sqlalchemy import ForeignKey, Index, String, Integer
from sqlalchemy.orm import Mapped, backref, mapped_column, relationship

from base import Base


class Types(Base):
    __tablename__ = "types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String)
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"))
    root_id: Mapped[int] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"), nullable=True)

    parent: Mapped[Optional["Types"]] = relationship(
        "Types",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref=backref("children", passive_deletes=True),
        passive_deletes=True,
    )
    root: Mapped["Types"] = relationship(
        "Types",
        foreign_keys=[root_id],
        remote_side=[id],
        backref=backref("root_children", passive_deletes=True),
        passive_deletes=True,
    )
    user_access: Mapped[List["UserTypeAccess"]] = relationship(
        "UserTypeAccess",
        back_populates="type",
    )
    event_types: Mapped[List["EventTypesTypes"]] = relationship(
        back_populates="type",
    )
    tin: Mapped[int] = mapped_column(index=True, default=0)
    tout: Mapped[int] = mapped_column(index=True, default=0)
    tree_size: Mapped[int] = mapped_column(default=1)
    __table_args__ = (
        Index("idx_instances_root_parent_type", "root_id", "parent_id"),
        Index("idx_rootid_tin_tout_type", "root_id", "tin", "tout"),
    )



class Objects(Base):
    __tablename__ = "objects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String)
    type_id: Mapped[int] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"))
    root_id: Mapped[int] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"), nullable=True)

    type_: Mapped["Types"] = relationship("Types", remote_side="Types.id", passive_deletes=True)
    parent: Mapped[Optional["Objects"]] = relationship(
        "Objects",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref=backref("children", passive_deletes=True),
        passive_deletes=True,
    )
    root: Mapped["Objects"] = relationship(
        "Objects",
        foreign_keys=[root_id],
        remote_side=[id],
        backref=backref("root_children", passive_deletes=True),
        passive_deletes=True,
    )
    instances: Mapped[List["Instances"]] = relationship(
        "Instances",
        back_populates="object_",
        cascade="all, delete-orphan",
    )
    user_access: Mapped[List["UserObjectAccess"]] = relationship(
        "UserObjectAccess",
        back_populates="object",
    )
    tin: Mapped[int] = mapped_column(index=True, default=0)
    tout: Mapped[int] = mapped_column(index=True, default=0)
    tree_size: Mapped[int] = mapped_column(default=1)
    __table_args__ = (
        Index("idx_instances_root_parent_obj", "root_id", "parent_id"),
        Index("idx_rootid_tin_tout_obj", "root_id", "tin", "tout"),
    )




class Properties(Base):
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("property_types.id", ondelete="CASCADE"))
    value: Mapped[str] = mapped_column(String)
    object_id: Mapped[int] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"))

    property: Mapped["PropertyTypes"] = relationship("PropertyTypes", passive_deletes=True)
    object_: Mapped["Objects"] = relationship("Objects", passive_deletes=True)


class PropertyTypes(Base):
    __tablename__ = "property_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    type_id: Mapped[int] = mapped_column(ForeignKey("types.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_static: Mapped[bool] = mapped_column(nullable=False)

    type_: Mapped["Types"] = relationship("Types", passive_deletes=True)


class Instances(Base):
    __tablename__ = "instances"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[Optional[str]] = mapped_column(String)
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("instances.id", ondelete="CASCADE"),
        index=True,
    )
    root_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"), nullable=True)
    object_id: Mapped[int] = mapped_column(ForeignKey("objects.id", ondelete="CASCADE"))
    is_active: Mapped[bool] = mapped_column(nullable=False)

    parent: Mapped[Optional["Instances"]] = relationship(
        "Instances",
        foreign_keys=[parent_id],
        remote_side=[id],
        backref=backref("children", passive_deletes=True),
        passive_deletes=True,
    )
    root: Mapped["Instances"] = relationship(
        "Instances",
        foreign_keys=[root_id],
        remote_side=[id],
        backref=backref("root_children", passive_deletes=True),
        passive_deletes=True,
    )
    object_: Mapped["Objects"] = relationship("Objects", back_populates="instances", passive_deletes=True)
    user_access: Mapped[List["UserInstanceAccess"]] = relationship(
        "UserInstanceAccess",
        back_populates="instance",
    )
    related_events: Mapped[List["Events"]] = relationship(
        back_populates="instance",
    )
    replacement_links: Mapped[List["Replacements"]] = relationship(
        foreign_keys="[Replacements.new_instance_id]",
        back_populates="new_instance",
    )
    tin: Mapped[int] = mapped_column(index=True, default=0)
    tout: Mapped[int] = mapped_column(index=True, default=0)
    tree_size: Mapped[int] = mapped_column(default=1)
    __table_args__ = (
        Index("idx_instances_root_parent_inst", "root_id", "parent_id"),
        Index("idx_rootid_tin_tout_inst", "root_id", "tin", "tout"),
    )




class InstanceProperties(Base):
    __tablename__ = "instance_properties"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    value: Mapped[str] = mapped_column(String)
    instance_id: Mapped[int] = mapped_column(ForeignKey("instances.id", ondelete="CASCADE"))
    property_type_id: Mapped[int] = mapped_column(ForeignKey("property_types.id", ondelete="CASCADE"))

    instance: Mapped["Instances"] = relationship("Instances", passive_deletes=True)
    property_type: Mapped["PropertyTypes"] = relationship("PropertyTypes", passive_deletes=True)
