# `postgres/python_core`

Этот каталог теперь является отдельным Python-проектом для всего, что связано с SQLAlchemy и инициализацией базы данных:

- ORM-модели;
- Alembic-миграции;
- сиды и bootstrap-скрипты;
- отдельные настройки Python-части базы.

## Что изменилось

Раньше SQLAlchemy-модели и сиды были в `backend/app/models`, `backend/app/db` и `backend/alembic`.

Теперь:

- Python-проект живёт в `postgres/python_core`;
- Python-пакет живёт в `postgres/python_core/src`;
- миграции лежат в `postgres/python_core/alembic`;
- миграции логов лежат в `postgres/python_core/alembic_logs`;
- сиды лежат в `postgres/python_core/src/scripts`;
- настройки для этого Python-проекта лежат в `postgres/python_core/.env`.

Backend теперь только использует этот пакет, а не владеет им.

При этом:

- `backend/.env` предназначен для локального запуска backend с хоста;
- в Docker Compose URL для backend подставляются напрямую из `compose.yaml`;
- `SUPERUSER_EMAIL` и `SUPERUSER_PASSWORD` backend больше не использует, они нужны только Python-части в `postgres/python_core`.

## Как устроен `pyproject.toml`

Файл [`pyproject.toml`](./pyproject.toml) описывает отдельный Python-проект.

Он нужен для трёх вещей:

1. Описывает зависимости пакета:
   - `SQLAlchemy`
   - `alembic`
   - `asyncpg`
   - `psycopg2-binary`
   - `python-dotenv`
   - `passlib[bcrypt]`
2. Говорит setuptools, что Python-код лежит в `src`.
3. Позволяет установить этот проект как editable package.

Команда:

```bash
pip install -e ./postgres/python_core
```

означает:

- пакет `core` ставится в текущее окружение;
- Python начинает видеть `core` без `PYTHONPATH`;
- изменения в `postgres/python_core/src` сразу подхватываются без переустановки.

После этого импорты работают так:

```python
from models import User, Types
from scripts.seed_superuser import seed_superuser
```

## Где лежат настройки

У Python-части базы теперь есть свой отдельный env-файл:

[`postgres/python_core/.env`](./.env)

В нём лежат:

- `DATABASE_URL`
- `LOG_DATABASE_URL`
- `SUPERUSER_EMAIL`
- `SUPERUSER_PASSWORD`

По умолчанию там стоят локальные значения для запуска с хоста:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/mydb
LOG_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/logsdb
SUPERUSER_EMAIL=root@example.com
SUPERUSER_PASSWORD=changeme
```

Важно:

- локально Alembic и сиды читают именно этот `.env`;
- в Docker Compose `DATABASE_URL` и `LOG_DATABASE_URL` переопределяются через `compose.yaml`, чтобы внутри контейнера использовались хосты `db` и `log_db`.

## Как теперь работает Docker Compose

В `compose.yaml` добавлен отдельный сервис `db-init`.

Он делает три вещи:

1. применяет обычные миграции:

```bash
alembic -c /app/postgres/python_core/alembic.ini upgrade head
```

2. применяет логовые миграции:

```bash
alembic -c /app/postgres/python_core/alembic_logs.ini upgrade head
```

3. запускает bootstrap-сиды:

```bash
python -m scripts.init_db
```

После успешного завершения `db-init` стартует `backend`.

Сам `backend` теперь не:

- создаёт ревизии;
- применяет миграции;
- сидит базу.

Он только запускает FastAPI.

## Как установить пакет локально

Из корня проекта:

```bash
pip install -e ./postgres/python_core
```

Это нужно сделать один раз на каждое виртуальное окружение.

## Как делать миграции локально

### 1. Подними локальную PostgreSQL

Можно использовать:

- локально установленный PostgreSQL;
- PostgreSQL из Docker, если он проброшен на `localhost:5432`;
- логовую БД на `localhost:5433`.

### 2. Проверь `postgres/python_core/.env`

Минимум должны быть корректны:

```env
DATABASE_URL=postgresql+asyncpg://...
LOG_DATABASE_URL=postgresql+asyncpg://...
```

### 3. Установи пакет

```bash
pip install -e ./postgres/python_core
```

### 4. Создай ревизию

Для основной базы:

```bash
alembic -c postgres/python_core/alembic.ini revision --autogenerate -m "describe_change"
```

Для логовой базы:

```bash
alembic -c postgres/python_core/alembic_logs.ini revision --autogenerate -m "describe_log_change"
```

После этого файл ревизии появится в:

- `postgres/python_core/alembic/versions`
- или `postgres/python_core/alembic_logs/versions`

### 5. Примени миграции

Для основной базы:

```bash
alembic -c postgres/python_core/alembic.ini upgrade head
```

Для логовой базы:

```bash
alembic -c postgres/python_core/alembic_logs.ini upgrade head
```

### 6. Если нужно откатиться

Пример:

```bash
alembic -c postgres/python_core/alembic.ini downgrade -1
```

## Как запускать сиды локально

После `pip install -e ./postgres/python_core`:

```bash
python -m scripts.seed_permissions
python -m scripts.seed_superuser
python -m scripts.init_db
```

`init_db` просто вызывает:

1. `seed_permissions`
2. `seed_superuser`

Оба скрипта сделаны идемпотентно:

- permissions не дублируются;
- superuser не создаётся повторно;
- связь `SUPER_USER` и `SUPER_PERMISSION` не дублируется.

## Что именно было перенесено из backend

Из backend были вынесены:

- модели SQLAlchemy;
- alembic-конфигурация и миграции;
- сиды `seed_roles` и `seed_superuser`;
- `permissions.json`.

При переносе логика сидов сохранена:

- `seed_permissions` по-прежнему читает `permissions.json` и дозаписывает только отсутствующие permission;
- `seed_superuser` по-прежнему:
  - проверяет пользователя по email;
  - создаёт `SUPER_PERMISSION`, если его нет;
  - создаёт `SUPER_USER`, если его нет;
  - создаёт связь role-permission, если её нет;
  - создаёт пользователя с bcrypt-хешем;
  - привязывает пользователя к `SUPER_USER`.

Отличие только архитектурное:

- скрипты больше не зависят от backend-модулей;
- всё, что нужно для Python-части базы, живёт внутри `postgres/python_core`.

## Практический workflow

Если меняешь ORM-модели:

1. правишь модели в `postgres/python_core/src/models`;
2. создаёшь ревизию:

```bash
alembic -c postgres/python_core/alembic.ini revision --autogenerate -m "your_change"
```

3. проверяешь сгенерированную миграцию;
4. применяешь её:

```bash
alembic -c postgres/python_core/alembic.ini upgrade head
```

Если нужно заново накатить bootstrap-данные:

```bash
python -m scripts.init_db
```

Если запускаешь весь проект через Docker Compose:

```bash
docker compose up --build
```

Тогда `db-init` сам прогонит миграции и сиды до запуска backend.

## Как использовать `db-revision`

В `compose.yaml` добавлен отдельный ручной сервис `db-revision`.

Он не запускается автоматически и нужен только для генерации новой Alembic-ревизии через `autogenerate`.

Пример:

```bash
docker compose --profile manual run --rm -e REVISION_MESSAGE="add_new_fields" db-revision
```

Что делает сервис:

```bash
alembic -c /app/postgres/python_core/alembic.ini revision --autogenerate -m "$REVISION_MESSAGE"
```

По умолчанию он возьмёт `DATABASE_URL` из `postgres/python_core/.env`.

Если нужно строить ревизию по другой базе, например по staging/cluster базе, можно передать URL явно:

```bash
docker compose --profile manual run --rm \
  -e DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/dbname" \
  -e REVISION_MESSAGE="cluster_compare" \
  db-revision
```

Практически лучше использовать не production, а staging/dev базу с актуальной схемой.
