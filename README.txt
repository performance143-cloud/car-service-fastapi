# 🚗 АвтоБосс — Бэкенд Автосервиса

Современный REST API для управления автосервисом.
Написан на **FastAPI**, **SQLAlchemy** и **PostgreSQL**.

## 🚀 Быстрый запуск (Инструкция для всех)

1. **Поднимите базу данных через Docker:**
   Убедитесь, что Docker Desktop запущен, и выполните в терминале:
   ```bash
   docker compose up -d

2.  Настройте переменные окружения:
Скопируйте файл .env.example в .env:

        cp .env.example .env
(Внутри .env пароль от базы данных: admin)

3.Установите зависимости:

pip install -r requirements.txt

4. ВАЖНО! Обновление базы данных (если вы обновляли код):
Если в проекте менялась структура таблиц (например, добавлялись марки машин), старую базу нужно пересоздать. Выполните:


        docker compose down -v
        docker compose up -d
(Флаг -v удаляет старые данные. Сервер при запуске создаст таблицы заново).

5. Запустите сервер:

uvicorn main:app --reload

6. Готово!

При первом запуске таблицы создадутся автоматически, а база заполнится тестовыми мастерами и услугами (см. app/seed.py).

Откройте документацию (Swagger): 👉 http://127.0.0.1:8000/docs

{
"email": "admin@autoboss.ru",
"password": "admin123"
}

🔐 Тестовые аккаунты
Администратор: admin@autoboss.ru / admin123

Мастер: master1@autoboss.ru / master123

Клиент: регистрируется самостоятельно через /auth/register

📝 Основные эндпоинты (Обновлено)
Аутентификация
POST /auth/register — Регистрация клиента

POST /auth/login — Вход (JWT)


Автомобили и Марки
GET /brands — Получить список марок (справочник)

POST /admin/brands — Создать марку (только админ)

GET /cars — Мои автомобили (защищено)

POST /cars — Добавить авто (защищено, принимает brand_id и model_name)


Услуги и Мастера
GET /services — Прайс-лист

POST /admin/services — Создать услугу (только админ)

GET /services/{id}/available-mechanics — Поиск свободных мастеров



Записи
POST /appointments — Создание записи (защищено, проверяет дату и время)

PATCH /appointments/{id}/cancel — Отмена записи клиентом

GET /clients/me/appointments — Все записи клиента

GET /mechanics/me/appointments — Записи мастера

PATCH /appointments/{id}/status — Изменение статуса (мастер)

GET /mechanics/me/stats — Статистика мастера



🏗️ Архитектура
app/models.py — Модели БД (Enum для ролей, связи)

app/schemas.py — Валидация данных (Pydantic V2)

app/auth.py — JWT и хеширование

app/main.py — Роутеры и бизнес-логика

app/seed.py — Автозаполнение БД