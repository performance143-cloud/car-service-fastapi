from app.database import SessionLocal
from app import models, auth

def seed_db():
    db = SessionLocal()
    try:
        # 0. Создаем Админа
        if not db.query(models.User).filter(models.User.role == models.RoleEnum.admin).first():
            admin_user = models.User(
                email="admin@autoboss.ru",
                password_hash=auth.get_password_hash("admin123"),
                role=models.RoleEnum.admin
            )
            db.add(admin_user)
            db.commit()

        # Если услуги уже есть, ничего не делаем (защита от дублей)
        if db.query(models.Service).first():
            return

        # 1. Добавляем услуги
        services = [
            models.Service(title="Замена масла", price=1500.00, duration_minutes=40),
            models.Service(title="Шиномонтаж", price=3000.00, duration_minutes=60),
            models.Service(title="Диагностика подвески", price=1000.00, duration_minutes=30),
            models.Service(title="Замена тормозных колодок", price=2500.00, duration_minutes=90),
        ]
        db.add_all(services)
        db.commit()

        # 2. Добавляем 6 мастеров
        for i in range(1, 7):
            email = f"master{i}@autoboss.ru"
            user = models.User(
                email=email,
                password_hash=auth.get_password_hash("master123"),
                role=models.RoleEnum.mechanic
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            employee = models.Employee(user_id=user.id, name=f"Мастер Иван {i}")
            db.add(employee)
            db.commit()

        print("УСПЕХ: База данных заполнена Админом, услугами и 6 мастерами!")
    finally:
        db.close()