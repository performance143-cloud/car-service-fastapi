from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import List

from app.database import engine, Base, get_db
from app import models, schemas, auth
from app.config import settings
from app.seed import seed_db

# Создание таблиц и заполнение БД
Base.metadata.create_all(bind=engine)
seed_db()

app = FastAPI(
    title="АвтоБосс API",
    description="Бэкенд автосервиса с распределением по мастерам",
    version="2.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# --- ЗАВИСИМОСТИ (ПРОВЕРКА ТОКЕНА) ---
def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
) -> models.User:
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

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id_int).first()
    if not user:
        raise credentials_exception
    return user


def get_current_mechanic(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
) -> models.Employee:
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


# --- 0. ПРОВЕРКА РАБОТЫ СЕРВЕРА ---
@app.get("/")
def root():
    return {"message": "АвтоБосс API работает! Документация: /docs"}


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
    db.flush()

    new_client = models.Client(user_id=new_user.id, name=user_data.name, phone=user_data.phone)
    db.add(new_client)
    db.commit()

    return {"status": "успех", "message": "Регистрация успешна!"}


@app.post("/auth/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not auth.verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    access_token = auth.create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}


# --- 2. УПРАВЛЕНИЕ МАРКАМИ ---
@app.post("/admin/brands", response_model=schemas.BrandResponse, status_code=201)
def create_brand(name: str, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if db.query(models.Brand).filter(models.Brand.name == name).first():
        raise HTTPException(400, "Такая марка уже есть")
    new_brand = models.Brand(name=name)
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)
    return new_brand


@app.get("/brands", response_model=List[schemas.BrandResponse])
def get_brands(db: Session = Depends(get_db)):
    return db.query(models.Brand).all()


# --- 2.1 УПРАВЛЕНИЕ МОДЕЛЯМИ ---
@app.post("/admin/models", response_model=schemas.CarModelResponse, status_code=201)
def create_car_model(
        model_data: schemas.CarModelCreate,
        admin: models.User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    brand = db.query(models.Brand).filter(models.Brand.id == model_data.brand_id).first()
    if not brand:
        raise HTTPException(404, "Марка не найдена")
    existing = db.query(models.CarModel).filter(
        models.CarModel.brand_id == model_data.brand_id,
        models.CarModel.name == model_data.name
    ).first()
    if existing:
        raise HTTPException(400, "Такая модель уже есть у этой марки")
    new_model = models.CarModel(brand_id=model_data.brand_id, name=model_data.name)
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model


@app.get("/brands/{brand_id}/models", response_model=List[schemas.CarModelResponse])
def get_models_by_brand(brand_id: int, db: Session = Depends(get_db)):
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(404, "Марка не найдена")
    return db.query(models.CarModel).filter(models.CarModel.brand_id == brand_id).all()


# --- 3. АВТОМОБИЛИ ---
@app.post("/cars", response_model=schemas.CarResponse)
def add_car(
        car_data: schemas.CarCreate,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Профиль клиента не найден")

    brand = db.query(models.Brand).filter(models.Brand.id == car_data.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Марка не найдена")

    existing_car = db.query(models.Car).filter(
        models.Car.client_id == client.id,
        models.Car.license_plate == car_data.license_plate
    ).first()
    if existing_car:
        raise HTTPException(status_code=400, detail="Машина с таким госномером уже добавлена")

    new_car = models.Car(
        client_id=client.id,
        brand_id=car_data.brand_id,
        model_name=car_data.model_name,
        license_plate=car_data.license_plate
    )
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


# --- 4. УСЛУГИ ---
@app.get("/services", response_model=List[schemas.ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()


@app.post("/admin/services", response_model=schemas.ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
        service_data: schemas.ServiceCreate,
        admin: models.User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    new_service = models.Service(
        title=service_data.title,
        price=service_data.price,
        duration_minutes=service_data.duration_minutes
    )
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    return new_service


# --- 5. ВЫБОР МАСТЕРА И ЗАПИСЬ ---
@app.get("/services/{service_id}/available-mechanics", response_model=List[schemas.MechanicResponse])
def get_available_mechanics(service_id: int, date_time: datetime, db: Session = Depends(get_db)):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    if date_time.hour < 8 or date_time.hour >= 20:
        raise HTTPException(status_code=400, detail="Мастер работает только с 8:00 до 20:00")

    new_end = date_time + timedelta(minutes=service.duration_minutes)
    all_mechanics = db.query(models.Employee).all()
    available = []

    for mech in all_mechanics:
        overlap = db.query(models.Appointment).filter(
            models.Appointment.mechanic_id == mech.id,
            models.Appointment.status != models.AppointmentStatus.cancelled,
            models.Appointment.date_time < new_end,
            models.Appointment.date_time + timedelta(minutes=60) > date_time
        ).first()
        if not overlap:
            available.append(mech)
    return available


@app.post("/appointments", response_model=schemas.AppointmentResponse)
def create_appointment(
        app_data: schemas.AppointmentCreate,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    if app_data.date_time.tzinfo is None:
        app_datetime = app_data.date_time.replace(tzinfo=timezone.utc)
    else:
        app_datetime = app_data.date_time

    if app_datetime < now:
        raise HTTPException(status_code=400, detail="Нельзя записаться на прошедшее время")

    if app_data.date_time.hour < 8 or app_data.date_time.hour >= 20:
        raise HTTPException(status_code=400, detail="Мастер работает только с 8:00 до 20:00")

    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Профиль клиента не найден")

    car = db.query(models.Car).filter(models.Car.id == app_data.car_id, models.Car.client_id == client.id).first()
    if not car:
        raise HTTPException(status_code=403, detail="Эта машина не принадлежит вам")

    service = db.query(models.Service).filter(models.Service.id == app_data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    new_end = app_data.date_time + timedelta(minutes=service.duration_minutes)
    existing = db.query(models.Appointment).filter(
        models.Appointment.mechanic_id == app_data.mechanic_id,
        models.Appointment.status != models.AppointmentStatus.cancelled,
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
        car_id=app_data.car_id,
        service_id=app_data.service_id,
        mechanic_id=app_data.mechanic_id,
        date_time=app_data.date_time,
        ticket_number=daily_count + 1
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app


@app.patch("/appointments/{appointment_id}/cancel")
def cancel_appointment(
        appointment_id: int,
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Профиль клиента не найден")

    app_obj = db.query(models.Appointment).join(models.Car).filter(
        models.Appointment.id == appointment_id,
        models.Car.client_id == client.id
    ).first()

    if not app_obj:
        raise HTTPException(status_code=404, detail="Запись не найдена или не принадлежит вам")

    app_obj.status = models.AppointmentStatus.cancelled
    db.commit()
    return {"status": app_obj.status.value}


# --- 6. ЛИЧНЫЙ КАБИНЕТ КЛИЕНТА ---
@app.get("/clients/me/appointments", response_model=List[schemas.AppointmentResponse])
def get_client_appointments(
        current_user: models.User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    client = db.query(models.Client).filter(models.Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Профиль клиента не найден")

    appointments = db.query(models.Appointment).join(models.Car).options(
        joinedload(models.Appointment.car),
        joinedload(models.Appointment.service)
    ).filter(
        models.Car.client_id == client.id
    ).order_by(models.Appointment.date_time.desc()).all()

    return appointments


# --- 7. ЛИЧНЫЙ КАБИНЕТ МАСТЕРА ---
@app.get("/mechanics/me/stats")
def get_mechanic_stats(
        mechanic: models.Employee = Depends(get_current_mechanic),
        db: Session = Depends(get_db)
):
    completed_count = db.query(func.count(models.Appointment.id)).filter(
        models.Appointment.mechanic_id == mechanic.id,
        models.Appointment.status == models.AppointmentStatus.done
    ).scalar()
    return {
        "mechanic_name": mechanic.name,
        "completed_cars": completed_count or 0
    }


@app.get("/mechanics/me/appointments", response_model=List[schemas.AppointmentResponse])
def get_mechanic_appointments(
        mechanic: models.Employee = Depends(get_current_mechanic),
        db: Session = Depends(get_db)
):
    appointments = db.query(models.Appointment).options(
        joinedload(models.Appointment.car),
        joinedload(models.Appointment.service)
    ).filter(
        models.Appointment.mechanic_id == mechanic.id
    ).order_by(models.Appointment.date_time.asc()).all()

    return appointments


@app.patch("/appointments/{appointment_id}/status", response_model=schemas.AppointmentResponse)
def update_appointment_status(
        appointment_id: int,
        new_status: models.AppointmentStatus,
        mechanic: models.Employee = Depends(get_current_mechanic),
        db: Session = Depends(get_db)
):
    app_obj = db.query(models.Appointment).filter(
        models.Appointment.id == appointment_id,
        models.Appointment.mechanic_id == mechanic.id
    ).first()

    if not app_obj:
        raise HTTPException(status_code=404, detail="Запись не найдена или не принадлежит вам")

    app_obj.status = new_status
    db.commit()
    db.refresh(app_obj)
    return app_obj


# --- 8. УПРАВЛЕНИЕ МАСТЕРАМИ (АДМИН) ---
@app.get("/admin/mechanics", response_model=List[schemas.MechanicResponse])
def get_all_mechanics(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(models.Employee).all()


@app.post("/admin/mechanics", response_model=schemas.MechanicResponse, status_code=201)
def create_mechanic(
        mechanic_data: schemas.MechanicCreate,
        admin: models.User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    if db.query(models.User).filter(models.User.email == mechanic_data.email).first():
        raise HTTPException(400, "Email уже зарегистрирован")

    new_user = models.User(
        email=mechanic_data.email,
        password_hash=auth.get_password_hash(mechanic_data.password),
        role=models.RoleEnum.mechanic
    )
    db.add(new_user)
    db.flush()

    new_employee = models.Employee(user_id=new_user.id, name=mechanic_data.name)
    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)
    return new_employee


@app.delete("/admin/mechanics/{mechanic_id}", status_code=204)
def delete_mechanic(
        mechanic_id: int,
        admin: models.User = Depends(get_current_admin),
        db: Session = Depends(get_db)
):
    employee = db.query(models.Employee).filter(models.Employee.id == mechanic_id).first()
    if not employee:
        raise HTTPException(404, "Мастер не найден")

    db.delete(employee.user)
    db.commit()
    return None


@app.get("/admin/finance")
def get_finance_stats(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    mechanics = db.query(models.Employee).all()

    mechanic_earnings = []
    total_revenue = 0.0

    for mech in mechanics:
        # Загружаем записи вместе с услугой (joinedload), чтобы app.service был не None
        completed_apps = db.query(models.Appointment).options(
            joinedload(models.Appointment.service)
        ).filter(
            models.Appointment.mechanic_id == mech.id,
            models.Appointment.status == models.AppointmentStatus.done
        ).all()

        # Считаем стоимость, проверяя, что service существует
        total_service_cost = sum(
            float(app.service.price) for app in completed_apps if app.service
        )

        earnings = total_service_cost * 0.65
        firm_income = total_service_cost * 0.35

        mechanic_earnings.append({
            "mechanic_id": mech.id,
            "mechanic_name": mech.name,
            "completed_count": len(completed_apps),
            "total_service_cost": total_service_cost,
            "earnings": earnings,
            "firm_income": firm_income
        })

        total_revenue += total_service_cost

    total_firm_income = total_revenue * 0.35
    total_mechanics_earnings = total_revenue * 0.65

    return {
        "mechanics": mechanic_earnings,
        "total_revenue": total_revenue,
        "total_firm_income": total_firm_income,
        "total_mechanics_earnings": total_mechanics_earnings
    }