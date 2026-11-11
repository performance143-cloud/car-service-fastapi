from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List

from app.database import engine, Base, get_db
from app import models, schemas, auth
from app.config import settings



from app.seed import seed_db

seed_db()

app = FastAPI(
    title="АвтоБосс API",
    description="Бэкенд автосервиса с распределением по мастерам",
    version="2.0.0"
)

# Безопасный CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# --- ЗАВИСИМОСТИ (ПРОВЕРКА ТОКЕНА) ---
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    payload = auth.decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise credentials_exception
    return user


def get_current_mechanic(current_user: models.User = Depends(get_current_user),
                         db: Session = Depends(get_db)) -> models.Employee:
    if current_user.role != models.RoleEnum.mechanic:
        raise HTTPException(status_code=403, detail="Требуется роль мастера")
    mechanic = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    if not mechanic:
        raise HTTPException(status_code=404, detail="Профиль мастера не найден")
    return mechanic


def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Требуются права администратора")
    return current_user


# --- 1. АУТЕНТИФИКАЦИЯ ---
@app.post("/auth/register", status_code=status.HTTP_201_CREATED)
def register_client(user_data: schemas.ClientRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    new_user = models.User(
        email=user_data.email,
        password_hash=auth.get_password_hash(user_data.password),
        role=models.RoleEnum.client
    )
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


# --- 2. АВТОМОБИЛИ ---
@app.post("/cars", response_model=schemas.CarResponse)
def add_car(car_data: schemas.CarCreate, current_user: models.User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Профиль клиента не найден")

    existing_car = db.query(models.Car).filter(
        models.Car.client_id == client.id,
        models.Car.license_plate == car_data.license_plate
    ).first()
    if existing_car:
        raise HTTPException(status_code=400, detail="Машина с таким госномером уже добавлена")

    new_car = models.Car(client_id=client.id, brand_model=car_data.brand_model, license_plate=car_data.license_plate)
    db.add(new_car)
    db.commit()
    db.refresh(new_car)
    return new_car


@app.get("/cars", response_model=List[schemas.CarResponse])
def get_my_cars(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        return []
    return db.query(models.Car).filter(models.Car.client_id == client.id).all()


# --- 3. УСЛУГИ ---
@app.get("/services", response_model=List[schemas.ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()


@app.post("/admin/services", response_model=schemas.ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(service_data: schemas.ServiceCreate, admin: models.User = Depends(get_current_admin),
                   db: Session = Depends(get_db)):
    new_service = models.Service(
        title=service_data.title,
        price=service_data.price,
        duration_minutes=service_data.duration_minutes
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service


# --- 4. ВЫБОР МАСТЕРА И ЗАПИСЬ ---
@app.get("/services/{service_id}/available-mechanics", response_model=List[schemas.MechanicResponse])
def get_available_mechanics(service_id: int, date_time: datetime, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    new_end = date_time + timedelta(minutes=service.duration_minutes)
    all_mechanics = db.query(models.Employee).all()
    available = []

    for mech in all_mechanics:
        overlap = db.query(models.Appointment).filter(
            models.Appointment.mechanic_id == mech.id,
            models.Appointment.date_time < new_end,
            models.Appointment.date_time + timedelta(minutes=60) > date_time
        ).first()
        if not overlap:
            available.append(mech)
    return available


@app.post("/appointments", response_model=schemas.AppointmentResponse)
def create_appointment(app_data: schemas.AppointmentCreate, current_user: models.User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == app_data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    new_end = app_data.date_time + timedelta(minutes=service.duration_minutes)
    existing = db.query(models.Appointment).filter(
        models.Appointment.mechanic_id == app_data.mechanic_id,
        models.Appointment.date_time < new_end,
        models.Appointment.date_time + timedelta(minutes=60) > app_data.date_time
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Мастер занят в это время")

    target_date = app_data.date_time.date()
    daily_count = db.query(func.count(models.Appointment.id)).filter(
        func.date(models.Appointment.date_time) == target_date
    ).scalar()

    new_app = models.Appointment(
        car_id=app_data.car_id, service_id=app_data.service_id, mechanic_id=app_data.mechanic_id,
        date_time=app_data.date_time, ticket_number=daily_count + 1
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app


@app.patch("/appointments/{appointment_id}/cancel")
def cancel_appointment(appointment_id: int, current_user: models.User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=403, detail="Только клиенты могут отменять записи")

    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    car = db.query(models.Car).filter(models.Car.id == appointment.car_id).first()
    if not car or car.client_id != client.id:
        raise HTTPException(status_code=403, detail="Вы не можете отменить чужую запись")

    if appointment.status == models.AppointmentStatus.done:
        raise HTTPException(status_code=400, detail="Нельзя отменить уже выполненный ремонт")

    appointment.status = models.AppointmentStatus.cancelled
    db.commit()
    return {"status": "успех", "message": "Запись отменена"}


# --- 5. ГРАФИК И СТАТИСТИКА (ДЛЯ МАСТЕРА) ---
@app.get("/mechanics/me/schedule", response_model=List[schemas.AppointmentResponse])
def get_mechanic_schedule(date: str, mechanic: models.Employee = Depends(get_current_mechanic),
                          db: Session = Depends(get_db)):
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте YYYY-MM-DD")

    return db.query(models.Appointment).filter(
        models.Appointment.mechanic_id == mechanic.id,
        func.date(models.Appointment.date_time) == target_date
    ).order_by(models.Appointment.date_time.asc()).all()


@app.get("/mechanics/me/stats")
def get_mechanic_stats(mechanic: models.Employee = Depends(get_current_mechanic), db: Session = Depends(get_db)):
    completed = db.query(func.count(models.Appointment.id)).filter(
        models.Appointment.mechanic_id == mechanic.id,
        models.Appointment.status == models.AppointmentStatus.done
    ).scalar()
    return {"mechanic": mechanic.name, "completed_cars": completed}


@app.patch("/appointments/{appointment_id}/status")
def update_status(appointment_id: int, new_status: models.AppointmentStatus,
                  mechanic: models.Employee = Depends(get_current_mechanic), db: Session = Depends(get_db)):
    app = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not app or app.mechanic_id != mechanic.id:
        raise HTTPException(status_code=404, detail="Запись не найдена или принадлежит другому мастеру")

    app.status = new_status
    db.commit()
    return {"status": "успех", "new_status": new_status}


# --- 7. АДМИНКА ---
@app.post("/admin/create-mechanic", status_code=status.HTTP_201_CREATED)
def create_mechanic(mechanic_data: schemas.MechanicCreate, admin: models.User = Depends(get_current_admin),
                    db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == mechanic_data.email).first():
        raise HTTPException(status_code=400, detail="Email уже занят")

    new_user = models.User(
        email=mechanic_data.email,
        password_hash=auth.get_password_hash(mechanic_data.password),
        role=models.RoleEnum.mechanic
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_employee = models.Employee(user_id=new_user.id, name=mechanic_data.name)
    db.add(new_employee)
    db.commit()
    return {"status": "успех", "message": f"Мастер {mechanic_data.name} успешно создан"}


@app.get("/")
def home():
    return {"status": "ok", "message": "АвтоБосс API v2.0 готов к работе"}