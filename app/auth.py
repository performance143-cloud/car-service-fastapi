from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext

# Настройки безопасности
SECRET_KEY = "SUPER_SECRET_AUTOBOSS_KEY_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # Токен действует 1 час

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Функция хэширования пароля
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# Функция проверки пароля при входе
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Функция создания JWT-токена
def create_access_token(data: dict):
    to_encode = data.copy()
    # Исправлено: используем современный и безопасный способ получения времени UTC
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
