from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


# --- АУТЕНТИФИКАЦИЯ ---
class ClientRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Пароль не менее 6 символов")
    name: str = Field(..., min_length=2)
    phone: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# --- АВТОМОБИЛИ ---
class CarCreate(BaseModel):
    brand_model: str = Field(..., example="Toyota Camry")
    license_plate: str = Field(..., example="А123АА777")


class CarResponse(BaseModel):
    id: int
    brand_model: str
    license_plate: str

    class Config:
        from_attributes = True


# --- УСЛУГИ (ПРАЙС-ЛИСТ) ---
class ServiceResponse(BaseModel):
    id: int
    title: str
    price: Decimal
    duration_minutes: int

    class Config:
        from_attributes = True


# --- ЗАПИСИ НА РЕМОНТ И ОЧЕРЕДЬ ---
class AppointmentCreate(BaseModel):
    car_id: int
    service_id: int
    mechanic_id: int
    date_time: datetime  # Формат: YYYY-MM-DDTHH:MM:SS
    box_number: int = Field(..., ge=1, le=5, description="Номер бокса от 1 до 5")


class AppointmentResponse(BaseModel):
    id: int
    car_id: int
    service_id: int
    mechanic_id: int
    date_time: datetime
    box_number: int
    ticket_number: int  # Тот самый номер в электронной очереди!
    status: str

    class Config:
        from_attributes = True
