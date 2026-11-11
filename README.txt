# 🚗 АвтоБосс — Бэкенд Автосервиса

Современный REST API для управления автосервисом.
Написан на **FastAPI**, **SQLAlchemy** и **PostgreSQL**.

## 🚀 Быстрый запуск

1. **Поднимите базу данных через Docker:**
   Убедитесь, что Docker Desktop запущен, и выполните в терминале:
   ```bash
   docker compose up -d

2.  Настройте переменные окружения:
    Скопируйте файл .env.example в .env:

    cp .env.example .env
(Внутри .env пароль от базы данных: admin)

3.  Установите зависимости:

    pip install -r requirements.txt

4. Запустите сервер:

    uvicorn main:app --reload

5. Готово!

При первом запуске таблицы создадутся автоматически, а база заполнится тестовыми мастерами и услугами (см. app/seed.py).

Откройте документацию (Swagger): 👉 http://127.0.0.1:8000/docs

📝 Основные эндпоинты
POST /auth/register — Регистрация клиента

POST /auth/login — Вход (JWT)

GET /cars — Мои автомобили (защищено)

GET /services — Прайс-лист

GET /services/{id}/available-mechanics — Поиск свободных мастеров на время

POST /appointments — Создание записи (защищено)

GET /mechanics/me/schedule — График мастера на любой день

GET /mechanics/me/stats — Статистика мастера (сколько машин сделано)

🏗️ Архитектура
app/models.py — Модели БД (SQLAlchemy, Enum для ролей и статусов)

app/schemas.py — Валидация данных (Pydantic)

app/auth.py — JWT-авторизация и хеширование паролей

app/main.py — Роутеры и бизнес-логика

app/seed.py — Автозаполнение базы при старте

