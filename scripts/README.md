# Скрипты запуска Docker Compose

В этой директории лежат готовые сценарии запуска `docker compose`.

Перед вызовом `docker compose` общий helper автоматически экспортирует `LOCAL_UID` и `LOCAL_GID` из `id -u` и `id -g`, если они еще не заданы в окружении. Это нужно, чтобы Python-контейнеры писали в bind mounts не от `root`.

Все скрипты запускаются из корня проекта или из любой директории так:

```bash
./scripts/<имя_скрипта>.bash
```

## Таблица сценариев

| Скрипт | Что делает | Нужны аргументы |
| --- | --- | --- |
| `create_revision.bash` | Поднимает `db` и `log_db`, затем пытается создать ревизии для основной и логовой БД | Да, сообщение ревизии |
| `migrate_only.bash` | Запускает только `db-init`, то есть миграции и bootstrap-сиды | Нет, но можно передать флаги `docker compose up` |
| `revision_and_migrate.bash` | Сначала пытается создать ревизии для основной и логовой БД, затем запускает миграции и сиды | Да, сообщение ревизии; после него можно передать флаги для `up` |
| `migrate_and_backend.bash` | Поднимает backend; через зависимости автоматически запускаются `db`, `log_db` и `db-init` | Нет, но можно передать флаги `docker compose up` |
| `migrate_backend_frontend.bash` | Поднимает backend и frontend; через зависимости автоматически запускаются `db`, `log_db` и `db-init` | Нет, но можно передать флаги `docker compose up` |
| `stop_cluster.bash` | Останавливает весь кластер `docker compose down` | Нет, но можно передать флаги `docker compose down` |

## Примеры запуска

Создать ревизию:

```bash
./scripts/create_revision.bash "add_user_index"
```

Если в одной из схем изменений нет, пустая ревизия для неё создана не будет.

Применить миграции и сиды:

```bash
./scripts/migrate_only.bash
```

Создать ревизию и сразу применить её:

```bash
./scripts/revision_and_migrate.bash "create_initial_schema"
```

Поднять backend:

```bash
./scripts/migrate_and_backend.bash
```

Поднять backend в фоне:

```bash
./scripts/migrate_and_backend.bash -d
```

Поднять backend и frontend:

```bash
./scripts/migrate_backend_frontend.bash
```

Поднять backend и frontend в фоне:

```bash
./scripts/migrate_backend_frontend.bash -d
```

Остановить кластер:

```bash
./scripts/stop_cluster.bash
```

Остановить кластер и удалить volumes:

```bash
./scripts/stop_cluster.bash -v
```

## Замечания

- Для `create_revision.bash` и `revision_and_migrate.bash` сообщение ревизии обязательно.
- Для `migrate_and_backend.bash`, `migrate_backend_frontend.bash`, `migrate_only.bash` и `stop_cluster.bash` любые дополнительные аргументы прокидываются в соответствующую команду `docker compose`.
- Для `create_revision.bash` и `revision_and_migrate.bash` первый аргумент всегда считается сообщением ревизии, а остальные аргументы прокидываются в шаги `docker compose up`.
- `LOCAL_UID` и `LOCAL_GID` обычно вручную задавать не нужно: скрипты выставляют их автоматически, но при желании их можно переопределить извне.
- Если нужно строить ревизию по другой базе, можно перед запуском экспортировать `DATABASE_URL` и при необходимости `LOG_DATABASE_URL`; скрипт передаст их в `db-revision` и `db-revision-logs`.
- Скрипты не удаляют volumes. Для полного сброса данных нужен отдельный вызов `docker compose down -v`, которого здесь специально нет.
