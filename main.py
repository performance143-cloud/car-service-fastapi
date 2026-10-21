from fastapi import FastAPI
from app.database import engine, Base
import app.models as models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="АвтоБосс API", description="Бэкенд для автосервиса")

@app.get("/")
def home():
    return {
        "status": "рабочий",
        "message": "Система АвтоБосс успешно подключена к PostgreSQL и готова к работе!"
    }