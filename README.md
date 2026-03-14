# pg-client
Веб-приложение поверх PostgreSQL.

## Настройка

### 1. Установи Docker

### 2. Заполни корневой `.env`

Можно использовать такие значения:

`BACKEND_PORT=8000`

`FRONTEND_PORT=3000`

`POSTGRES_USER=postgres`

`POSTGRES_PASSWORD=postgres`

`POSTGRES_DB=mydb`

`LOG_POSTGRES_USER=postgres`

`LOG_POSTGRES_PASSWORD=postgres`

`LOG_POSTGRES_DB=logsdb`

`PGADMIN_EMAIL=admin@admin.com`

`PGADMIN_PASSWORD=admin`

`PGADMIN_PORT=5000`

### 3. Заполни `backend/.env`

Можно использовать такие значения:

`DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/mydb`

`LOG_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/logsdb`

`BACKEND_PORT=8000`

`JWT_ALGORITHM=HS256`

`secret_key=change_me`

### 4. Заполни `postgres/python_core/.env`

Этот файл нужен для локального запуска Alembic и сидов вне Docker Compose.

Можно использовать такие значения:

`DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/mydb`

`LOG_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/logsdb`

`SUPERUSER_EMAIL=root@example.com`

`SUPERUSER_PASSWORD=changeme`

### 5. Заполни `frontend/.env`

Можно использовать такие значения:

`VITE_API_BASE_URL=http://localhost:8000`

### 6. Запуск через Docker Compose

Windows:

`docker compose up --build -d`

Linux:

`sudo docker compose up --build -d`

Если запускать через скрипты из [`scripts`](./scripts), они сами экспортируют `LOCAL_UID` и `LOCAL_GID` из `id -u` и `id -g`, поэтому вручную их обычно задавать не нужно.

### 7. Миграции и bootstrap-данные

ORM-модели, Alembic и базовые bootstrap-сиды живут в [`postgres/python_core`](./postgres/python_core).
API-сидер для наполнения базы через backend-эндпоинты лежит в [`postgres/api_seeder`](./postgres/api_seeder).

Полезные команды:

`pip install -e ./postgres/python_core`

`alembic -c postgres/python_core/alembic.ini revision --autogenerate -m "your_change"`

`alembic -c postgres/python_core/alembic.ini upgrade head`

`python -m scripts.init_db`

`docker compose --profile manual run --rm -e REVISION_MESSAGE="your_change" db-revision`

`pip install -r ./postgres/api_seeder/requirements.txt`

`python -m postgres.api_seeder --dry-run --progress text`

Подробное описание:

- [`postgres/python_core/README.md`](./postgres/python_core/README.md)
- [`postgres/api_seeder/README.md`](./postgres/api_seeder/README.md)
- [`postgres/api_seeder/DEVELOPER.md`](./postgres/api_seeder/DEVELOPER.md)

### 8. Остановка

`docker compose down`

## Доступ

После запуска:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000/docs](http://localhost:8000/docs)
- pgAdmin: [http://localhost:5000](http://localhost:5000)
