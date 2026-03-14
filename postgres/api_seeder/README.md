# API Seeder

Сидер заполняет базу через FastAPI-эндпоинты.
Текущая версия использует `httpx.AsyncClient` и параллелит независимые фазы с ограничением по concurrency.

Расположение:

```text
postgres/api_seeder
```

Важная деталь:

```text
postgres/api_seeder/schemas -> ../../backend/app/schemas
```

`schemas` рядом с сидером не является отдельной директорией с копией файлов.
Это симлинк на backend-схемы, чтобы сидер использовал те же pydantic-модели запросов, что и FastAPI.
Если переносить или копировать `api_seeder`, симлинк тоже нужно перенести или пересоздать.

Зависимости:

```bash
pip install -r postgres/api_seeder/requirements.txt
```

Запуск:

```bash
python -m postgres.api_seeder --prefix seed-techdb
```

Полезные опции:

```bash
python -m postgres.api_seeder --dry-run
python -m postgres.api_seeder --base-url http://localhost:8000 --username root@example.com --password changeme
python -m postgres.api_seeder --prefix seed-techdb-v2 --instances-per-root-object 3 --events-per-instance-min 6 --events-per-instance-max 8
python -m postgres.api_seeder --prefix seed-techdb-v3 --concurrency 24
python -m postgres.api_seeder --prefix seed-techdb-v4 --progress tqdm
```

Что делает:

- Создает 5 фиксированных деревьев типов.
- Строит деревья объектов с большим количеством листовых компонент.
- Создает `property_types`, значения `properties` и `instanceproperties`.
- Создает 25 типов событий, связи `event_types_types`, события и `replacements`.
- Проверяет уникальность по root-type prefix и останавливается, если такой набор уже есть.
- Независимые root-деревья и массовые вставки выполняет параллельно, а цепочки `replacements` внутри одного дерева оставляет последовательными.
- Поддерживает прогресс-режимы `--progress none|text|tqdm`.
