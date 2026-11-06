from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import JWTError, jwt
from datetime import datetime

from app.database import engine, Base, SessionLocal
import app.models as models
import app.schemas as schemas
import app.auth as auth

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="АвтоБосс API",
    description="Канонический бэкенд автосервиса с электронной очередью и распределением боксов"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Зависимость подключения к БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Зависимость: проверка JWT и извлечение текущего пользователя
def get_current_user(db: Session = Depends(get_db), token: str = Depends(auth.pwd_context)):
    # Простейший разбор Bearer токена из заголовка Authorization
    from fastapi.security import OAuth2PasswordBearer
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

    # Для интеграции с фронтендом сделаем извлечение токена вручную из заголовков, чтобы фронту было проще:
    pass


# Упрощенная надежная зависимость получения юзера по ID из токена для Swagger/Фронта
def get_user_by_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Невалидный токен")
    except JWTError:
        raise HTTPException(status_code=401, detail="Не удалось проверить учетные данные")

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


# --- 1. АУТЕНТИФИКАЦИЯ ---

@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_client(user_data: schemas.ClientRegister, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Этот email уже зарегистрирован")

    hashed_pwd = auth.get_password_hash(user_data.password)
    new_user = models.User(email=user_data.email, password_hash=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_client = models.Client(user_id=new_user.id, name=user_data.name, phone=user_data.phone)
    db.add(new_client)
    db.commit()
    return {"status": "успех", "message": "Регистрация успешна!"}


@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


# --- 2. УПРАВЛЕНИЕ АВТОМОБИЛЯМИ (Для клиентов) ---

@app.post("/cars", response_model=schemas.CarResponse)
def add_car(car_data: schemas.CarCreate, user_id: int, db: Session = Depends(get_db)):
    # Находим профиль клиента по user_id
    client = db.query(models.Client).filter(models.Client.user_id == user_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Профиль клиента не найден")

    new_car = models.Car(
        client_id=client.id,
        brand_model=car_data.brand_model,
        license_plate=car_data.license_plate
    )
    db.add(new_car)
    db.commit()
    db.refresh(new_car)
    return new_car


@app.get("/cars", response_model=list[schemas.CarResponse])
def get_my_cars(user_id: int, db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.user_id == user_id).first()
    if not client:
        return []
    return db.query(models.Car).filter(models.Car.client_id == client.id).all()


# --- 3. ПРАЙС-ЛИСТ УСЛУГ (Доступно всем) ---

@app.get("/services", response_model=list[schemas.ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()


# --- 4. ОНЛАЙН-ЗАПИСЬ И ЭЛЕКТРОННАЯ ОЧЕРЕДЬ ---

@app.post("/appointments", response_model=schemas.AppointmentResponse)
def create_appointment(appointment_data: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    # ПРОВЕРКА 1: Не занят ли выбранный бокс на это конкретное время?
    clash = db.query(models.Appointment).filter(
        models.Appointment.box_number == appointment_data.box_number,
        models.Appointment.date_time == appointment_data.date_time
    ).first()

    if clash:
        raise HTTPException(
            status_code=400,
            detail=f"Бокс №{appointment_data.box_number} уже занят на время {appointment_data.date_time}. Выберите другое время или бокс."
        )

    # ПРОВЕРКА 2: Автоматическая генерация красивого талона электронной очереди на этот день
    # Считаем сколько записей уже есть на эту дату и прибавляем 1
    target_date = appointment_data.date_time.date()
    daily_count = db.query(func.count(models.Appointment.id)).filter(
        func.date(models.Appointment.date_time) == target_date
    ).scalar()

    generated_ticket = daily_count + 1  # Первый запишется под №1, второй №2 и т.д.

    new_appointment = models.Appointment(
        car_id=appointment_data.car_id,
        service_id=appointment_data.service_id,
        mechanic_id=appointment_data.mechanic_id,
        date_time=appointment_data.date_time,
        box_number=appointment_data.box_number,
        ticket_number=generated_ticket,
        status="ожидает"
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    return new_appointment


# --- 5. МОНИТОР ЭЛЕКТРОННОЙ ОЧЕРЕДИ (Для табло автосервиса и мастеров) ---

@app.get("/queue", response_model=list[schemas.AppointmentResponse])
def get_active_queue(db: Session = Depends(get_db)):
    # Возвращает список всех записей на сегодня, отсортированных по времени слота
    today = datetime.now().date()
    return db.query(models.Appointment).filter(
        func.date(models.Appointment.date_time) == today
    ).order_by(models.Appointment.date_time.asc()).all()


# --- 6. ИЗМЕНЕНИЕ СТАТУСА (Работа мастера) ---

@app.patch("/appointments/{appointment_id}/status")
def update_appointment_status(appointment_id: int, new_status: str, db: Session = Depends(get_db)):
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    if new_status not in ["ожидает", "в работе", "готова"]:
        raise HTTPException(status_code=400, detail="Неверный статус. Допустимы: ожидает, в работе, готова")

    appointment.status = new_status
    db.commit()
    return {"status": "успех", "message": f"Статус записи {appointment_id} изменен на '{new_status}'"}


@app.get("/")
def home():
    return {
        "status": "рабочий",
        "message": "Система АвтоБосс успешно подключена к PostgreSQL и готова к работе!"
    }
