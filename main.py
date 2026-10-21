from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
import app.models as models
import app.schemas as schemas
import app.auth as auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="АвтоБосс API", description="Бэкенд для автосервиса")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Зависимость для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 1. МАРШРУТ РЕГИСТРАЦИИ КЛИЕНТА
@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_client(user_data: schemas.ClientRegister, db: Session = Depends(get_db)):
    # Проверяем, нет ли уже такого email в базе
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Этот email уже зарегистрирован")

    # 1. Создаем пользователя в таблице users
    hashed_pwd = auth.get_password_hash(user_data.password)
    new_user = models.User(email=user_data.email, password_hash=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 2. Создаем профиль клиента в таблице clients и связываем 1:1
    new_client = models.Client(user_id=new_user.id, name=user_data.name, phone=user_data.phone)
    db.add(new_client)
    db.commit()

    return {"status": "успех", "message": "Вы успешно зарегистрировались в АвтоБосс!"}


# 2. МАРШРУТ ВХОДА (ЛОГИН)
@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    # Создаем токен, зашивая туда id пользователя
    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/")
def home():
    return {
        "status": "рабочий",
        "message": "Система АвтоБосс успешно подключена к PostgreSQL и готова к работе!"
    }
