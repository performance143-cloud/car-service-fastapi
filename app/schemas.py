from pydantic import BaseModel, EmailStr
from typing import Optional

# Что нужно передать для регистрации клиента
class ClientRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str

# Что нужно передать для входа
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Что бэкенд вернет при успешном входе (Токен доступа)
class Token(BaseModel):
    access_token: str
    token_type: str
