from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models import RoleEnum, AppointmentStatus

class ClientRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    # Разрешаем пробелы, скобки, дефисы и плюс. Внутри — 10–15 цифр.
    phone: str = Field(..., pattern=r"^[\+\d\s\(\)\-]{10,20}$")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class BrandResponse(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

class CarCreate(BaseModel):
    brand_id: int
    model_name: str
    license_plate: str = Field(..., pattern=r"^[А-ЯA-Z]\d{3}[А-ЯA-Z]{2}\d{2,3}$")

class CarResponse(BaseModel):
    id: int
    brand: BrandResponse
    model_name: str
    license_plate: str
    model_config = ConfigDict(from_attributes=True)

class ServiceResponse(BaseModel):
    id: int
    title: str
    price: Decimal
    duration_minutes: int
    model_config = ConfigDict(from_attributes=True)

class MechanicResponse(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

class ServiceCreate(BaseModel):
    title: str
    price: Decimal
    duration_minutes: int

class MechanicCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)

class CarModelCreate(BaseModel):
    brand_id: int
    name: str

class CarModelResponse(BaseModel):
    id: int
    name: str
    brand_id: int
    model_config = ConfigDict(from_attributes=True)