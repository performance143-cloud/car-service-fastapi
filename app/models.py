import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    mechanic = "mechanic"
    client = "client"


class AppointmentStatus(str, enum.Enum):
    pending = "ожидает"
    in_progress = "в работе"
    done = "готова"
    cancelled = "отменена"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.client, nullable=False)

    client = relationship("Client", back_populates="user", uselist=False, cascade="all, delete-orphan")
    employee = relationship("Employee", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=False)

    user = relationship("User", back_populates="client")
    cars = relationship("Car", back_populates="client", cascade="all, delete-orphan")


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    name = Column(String(150), nullable=False)

    user = relationship("User", back_populates="employee")
    appointments = relationship("Appointment", back_populates="mechanic")


class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"))
    brand_model = Column(String(100), nullable=False)
    license_plate = Column(String(20), nullable=False)

    client = relationship("Client", back_populates="cars")
    appointments = relationship("Appointment", back_populates="car")


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
    date_time = Column(DateTime, nullable=False)  # Время НАЧАЛА
    ticket_number = Column(Integer, nullable=True)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.pending, nullable=False)

    car = relationship("Car", back_populates="appointments")
    service = relationship("Service")
    mechanic = relationship("Employee", back_populates="appointments")