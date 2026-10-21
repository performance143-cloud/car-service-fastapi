from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # Добавили импорт
from app.database import engine, Base
import app.models as models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="АвтоБосс API", description="Бэкенд для автосервиса")

# НАСТРОЙКА CORS: разрешаем фронтенду подключаться к бэкенду
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # На этапе разработки разрешаем доступ всем
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем любые запросы (GET, POST и т.д.)
    allow_headers=["*"],  # Разрешаем любые заголовки
)

@app.get("/")
def home():
    return {
        "status": "рабочий",
        "message": "Система АвтоБосс успешно подключена к PostgreSQL и готова к работе!"
    }
