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


🔐 Тестовые аккаунты
Администратор: admin@autoboss.ru / admin123

Мастер: master1@autoboss.ru / master123

Клиент: регистрируется самостоятельно через /auth/register

📝 Основные эндпоинты
POST /auth/register — Регистрация клиента

POST /auth/login — Вход (JWT)

GET /cars — Мои автомобили (защищено)

POST /cars — Добавить авто (защищено)

GET /services — Прайс-лист

POST /admin/services — Создать услугу (только админ)

GET /services/{id}/available-mechanics — Поиск свободных мастеров

POST /appointments — Создание записи (защищено)

PATCH /appointments/{id}/cancel — Отмена записи клиентом

GET /mechanics/me/schedule — График мастера на любой день

GET /mechanics/me/stats — Статистика мастера

PATCH /appointments/{id}/status — Изменение статуса (мастер)

🏗️ Архитектура
app/models.py — Модели БД (Enum для ролей, связи)

app/schemas.py — Валидация данных (Pydantic V2)

app/auth.py — JWT и хеширование

app/main.py — Роутеры и бизнес-логика

app/seed.py — Автозаполнение БД



