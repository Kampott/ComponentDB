from sqlalchemy import Column, Integer, String
from app.db.database import Base

class Objects(Base):
    __tablename__ = "objects"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(Integer, nullable=False, unique=False)
    id_parent = Column(Integer, nullable=False, unique=False)
    id_root = Column(Integer, nullable=False, unique=False)
    index_of_layer = Column(Integer, nullable=False, unique=False)
