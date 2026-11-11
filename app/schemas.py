from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models import RoleEnum, AppointmentStatus

class ClientRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class CarCreate(BaseModel):
    brand_model: str
    license_plate: str

class CarResponse(BaseModel):
    id: int
    brand_model: str
    license_plate: str
    class Config:
        from_attributes = True

class ServiceResponse(BaseModel):
    id: int
    title: str
    price: Decimal
    duration_minutes: int
    class Config:
        from_attributes = True

class MechanicResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    car_id: int
    service_id: int
    mechanic_id: int
    date_time: datetime

class AppointmentResponse(BaseModel):
    id: int
    car_id: int
    service_id: int
    mechanic_id: int
    date_time: datetime
    ticket_number: Optional[int]
    status: AppointmentStatus
    class Config:
        from_attributes = True