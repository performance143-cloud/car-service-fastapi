from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name = Column(String(150), nullable=False)
    role = Column(String(30), nullable=False)  # mechanic, admin

class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"))
    brand_model = Column(String(100), nullable=False)
    license_plate = Column(String(20), nullable=False)

class Service(Base):
    __tablename__ = "services"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=False)

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    car_id = Column(Integer, ForeignKey("cars.id", ondelete="CASCADE"))
    service_id = Column(Integer, ForeignKey("services.id", ondelete="RESTRICT"))
    mechanic_id = Column(Integer, ForeignKey("employees.id", ondelete="RESTRICT"))
    date_time = Column(DateTime, nullable=False)
    box_number = Column(Integer, nullable=False)
    ticket_number = Column(Integer, nullable=False)  # Электронная очередь прямо здесь!
    status = Column(String(30), default="ожидает")  # ожидает, в работе, готова
