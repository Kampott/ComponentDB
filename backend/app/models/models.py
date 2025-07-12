from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class Component(Base):
    __tablename__ = "components"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)

    documents = relationship("Document", back_populates="component")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    component_id = Column(Integer, ForeignKey("components.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)

    component = relationship("Component", back_populates="documents")
