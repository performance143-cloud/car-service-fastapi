from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="client")

class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    brand_model = Column(String(100), nullable=False)
    license_plate = Column(String(20), nullable=False)

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
