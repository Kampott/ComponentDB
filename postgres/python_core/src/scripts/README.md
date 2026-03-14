# Core Scripts

Скрипты в этой директории являются частью установленного пакета `componentdb-postgres`.

Примеры запуска после `pip install -e ./postgres/python_core`:

```bash
python -m scripts.seed_permissions
python -m scripts.seed_superuser
python -m scripts.init_db
```

`init_db` предназначен для базовой инициализации:

- применить bootstrap-данные;
- досоздать permissions;
- досоздать superuser.

Настройки для скриптов и Alembic берутся из [`postgres/python_core/.env`](../../.env).
