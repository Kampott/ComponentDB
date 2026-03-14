Alembic-конфигурация для логовой базы данных.

Здесь лежат:

- `env.py` с настройкой Alembic;
- `script.py.mako` для генерации ревизий логовой базы.

Создание ревизии:

```bash
alembic -c postgres/python_core/alembic_logs.ini revision --autogenerate -m "your_change"
```

Применение миграций:

```bash
alembic -c postgres/python_core/alembic_logs.ini upgrade head
```
