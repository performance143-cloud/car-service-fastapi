from fastapi import FastAPI

# Создаем приложение FastAPI
app = FastAPI(title="АвтоБосс API", description="Бэкенд для автосервиса")

# Стартовый маршрут (главная страница сервера)
@app.get("/")
def home():
    return {
        "status": "рабочий",
        "message": "Добро пожаловать в систему автоматизации автосервиса АвтоБосс!"
    }
