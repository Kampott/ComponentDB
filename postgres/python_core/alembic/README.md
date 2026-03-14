Alembic-конфигурация для основной базы данных.

Здесь лежат:

- `env.py` с настройкой Alembic;
- `script.py.mako` для генерации ревизий;
- каталог `versions` для файлов миграций.

Создание ревизии:

```bash
alembic -c postgres/python_core/alembic.ini revision --autogenerate -m "your_change"
```

Применение миграций:

```bash
alembic -c postgres/python_core/alembic.ini upgrade head
```
