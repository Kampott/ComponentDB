# API Seeder Developer Guide

Этот документ описывает внутреннее устройство сидера из директории `postgres/api_seeder/`.
Пользовательский quickstart лежит в [`README.md`](./README.md). Здесь собрана информация для программиста, который будет менять архитектуру, расширять дерево данных или отлаживать выполнение.

## 1. Назначение

Сидер заполняет ComponentDB через FastAPI API, а не напрямую через ORM.

Цели:

- создать фиксированные деревья типов;
- конкретизировать их в большие деревья объектов;
- создать экземпляры по деревьям объектов;
- заполнить статические и динамические свойства;
- создать типы событий, связи событий с типами, сами события и замены;
- делать это параллельно там, где нет логической зависимости;
- давать управляемый прогресс выполнения и переживать истечение access token.

## 2. Структура файлов

- [`catalog.py`](./catalog.py) — фиксированные предметные данные: деревья устройств и каталог типов событий.
- [`client.py`](./client.py) — async HTTP-клиент поверх `httpx.AsyncClient`, relogin на `401`, ограничение concurrency через `Semaphore`.
- [`seed.py`](./seed.py) — основной orchestration, построение дерева, генерация payload'ов и вызовы API.
- [`progress.py`](./progress.py) — abstraction для прогресса: `none`, `text`, `tqdm`.
- [`main.py`](./main.py) — CLI, загрузка env defaults, сбор `SeedConfig`, запуск `Seeder`.
- [`requirements.txt`](./requirements.txt) — зависимости сидера.
- [`schemas`](./schemas) — симлинк на `backend/app/schemas`, используется для валидации запросов через pydantic-модели.

Важно:

- `schemas` не должен превращаться в обычную копию файлов;
- это именно симлинк `postgres/api_seeder/schemas -> ../../backend/app/schemas`;
- если backend-схемы меняются, сидер автоматически видит эти изменения через симлинк;
- если директорию сидера переносить вручную, симлинк нужно проверить отдельно.

## 3. Основные сущности в коде

В [`seed.py`](./seed.py):

- `SeedConfig` — пользовательские настройки запуска.
- `SeedStats` — счетчики результата.
- `CreatedType` — локальное представление уже созданного типа.
- `CreatedObject` — локальное представление объекта.
- `CreatedInstance` — локальное представление экземпляра.
- `Seeder` — основная stateful orchestration-сущность.

Состояние `Seeder` хранит:

- `type_by_key` — map `NodeSpec.key -> CreatedType`;
- `objects_by_id` — map `object_id -> CreatedObject`;
- `root_object_ids` — список root-object для последующего создания instance trees;
- `property_type_ids` — map `(type_key, is_static) -> list[(property_name, property_type_id)]`;
- `event_type_ids` — map `event_key -> event_type_id`.

## 4. Откуда берутся данные

### 4.1. Типы и объекты

Источник — [`catalog.py`](./catalog.py).

Главная структура — `NodeSpec`:

- `key` — стабильный технический идентификатор узла;
- `name` — человекочитаемое имя;
- `tags` — семантические теги для генерации свойств и событий;
- `count` — сколько однотипных объектов создается на уровне object tree;
- `children` — дочерние узлы.

Важно:

- type tree использует структуру `children`, но игнорирует `count`;
- object tree использует и структуру, и `count`.

### 4.2. События

Источник — `EVENT_TYPES` в [`catalog.py`](./catalog.py).

Каждый `EventTypeSpec` содержит:

- `key`;
- `name`;
- `tags`;
- `replacement`.

Флаг `replacement=True` означает, что событие предполагает отдельную запись в `Replacements`.

## 5. Общий pipeline выполнения

`Seeder.run()` в [`seed.py`](./seed.py#L103) выполняет фазы в строгом порядке:

1. `guard_prefix`
2. `init_progress`
3. `seed_types`
4. `seed_property_types`
5. `seed_objects`
6. `seed_object_properties`
7. `seed_event_types`
8. `seed_instances_and_events`

Зависимости между фазами:

- `property_types` зависят от `types`;
- `objects` зависят от `types`;
- `properties` зависят от `objects` и `property_types`;
- `event_types_types` зависят от `types` и `event_types`;
- `instances` зависят от `objects`;
- `instanceproperties` зависят от `instances` и `property_types`;
- `events` зависят от `instances` и `event_types`;
- `replacements` зависят от `events` и дополнительных `instances`.

## 6. Где есть параллелизм

### 6.1. Между корневыми деревьями

Независимые root-деревья создаются через `asyncio.gather(...)`.

Это используется для:

- root types;
- root object trees;
- root instance trees.

### 6.2. Внутри уровня одного родителя

Для типов и объектов потомки одного родителя создаются параллельно пачкой, затем одним `GET` резолвятся обратно в id.

Это важная оптимизация относительно старой версии, где почти каждый `POST` сопровождался отдельным `GET`.

### 6.3. Массовые вставки

Параллельно запускаются:

- `property_types` по типам;
- `properties` по всем объектам;
- `event_types`;
- `event_types_types`;
- `instanceproperties` по конкретному instance tree.

## 7. Где параллелизм намеренно ограничен

### 7.1. Replacements внутри одного дерева

Внутри `_seed_events_for_tree()` обработка одного instance tree идет последовательно.

Причина:

- replacement меняет активный экземпляр;
- следующий event должен идти уже на новый current instance;
- параллельная обработка одного логического слота дала бы гонки по `is_active`, `replacement_id` и последовательности событий.

### 7.2. Parent-child зависимости

Для `types` и `objects` нельзя создавать потомков до получения id родителя.
Поэтому параллелизм разрешен на уровне siblings, а не произвольно по всему дереву.

## 8. Как работает API клиент

[`client.py`](./client.py) делает следующее:

- держит один общий `httpx.AsyncClient`;
- ограничивает количество одновременных запросов через `Semaphore`;
- хранит credentials после первичного login;
- при `401` делает relogin и повторяет исходный запрос один раз.

### 8.1. Почему relogin нужен

Сидер может работать долго, особенно на фазах `properties`, `instanceproperties`, `events`.
У backend access token ограничен по времени, поэтому без relogin длинный прогон умирает посередине.

### 8.2. Как устроен relogin

- первый `401` приходит в `_request()`;
- клиент захватывает `_auth_lock`;
- если токен уже обновил другой запрос, повторный relogin не делается;
- иначе выполняется `/auth/login`;
- новый bearer token сохраняется в headers клиента;
- исходный запрос выполняется повторно.

## 9. Прогресс выполнения

Прогресс строится в два шага:

1. сидер оценивает totals в `_init_progress()`;
2. после успешных операций вызывает `progress.advance(...)`.

### 9.1. Реализации

В [`progress.py`](./progress.py):

- `NullProgressReporter` — без вывода;
- `TextProgressReporter` — редкие текстовые апдейты по процентам;
- `TqdmProgressReporter` — отдельный progress bar на фазу.

### 9.2. Почему totals местами только оценочные

Для фаз `events`, `replacements` и частично `instance_properties` total заранее не может быть известен абсолютно точно:

- replacements зависят от `replacement_probability`;
- events зависят от random count per instance;
- дополнительные instance properties появляются у replacement instances.

Поэтому totals там являются хорошей оценкой, а не строгим математическим фактом.

## 10. Генерация свойств

Генерация свойств основана на `tags` узла.

Логика:

- каждый тип получает 4 статических и 4 динамических property types;
- 3 имени общие или полустандартные;
- 1 имя зависит от тега устройства.

Примеры:

- `power -> rated_power_kw / load_pct`
- `network -> bandwidth_class / packet_error_rate`
- `sensor -> measurement_class / calibration_state`

Значения свойств генерируются локальными helper-функциями:

- `_object_property_value(...)`
- `_instance_property_value(...)`

Обе функции сознательно детерминированы относительно объекта/экземпляра, чтобы поведение было воспроизводимым.

## 11. Генерация событий и замен

### 11.1. Привязка типов событий к типам

Для каждого типа берутся те `EventTypeSpec`, у которых:

- есть tag `all`;
- или есть пересечение `event.tags` и `type.tags`.

Это делает матрицу `event_types_types` автоматически выводимой из предметных тегов.

### 11.2. Генерация events

Для каждого instance:

- выбирается диапазон `events_per_instance_min/max`;
- для листовых узлов может быть выбрана одна точка replacement;
- до replacement события идут на текущий instance;
- после replacement события идут уже на новый instance.

### 11.3. Почему replacement instance создается с `is_active=False`

Backend для `/replacements/` ожидает, что replacement instance уже существует, но еще не активен.
Сам endpoint:

- перепривязывает replacement к нужному parent;
- активирует replacement;
- деактивирует replaced tree.

Если создать replacement как `is_active=True`, backend вернет `400`.

## 12. Dry-run режим

`--dry-run`:

- не делает сетевых запросов;
- генерирует synthetic ids через локальный counter;
- позволяет проверить pipeline, прогресс и итоговые размеры без доступа к API.

Это основной способ быстро проверить корректность orchestration после рефакторинга.

## 13. Известные ограничения

### 13.1. Очень большой объем запросов

Даже после batching сидер генерирует много HTTP-запросов.
Если backend узкий по производительности, нужно уменьшать:

- `instances_per_root_object`
- `events_per_instance_min/max`
- `concurrency`

### 13.2. Totals прогресса не всегда точны

См. раздел 9.2.

### 13.3. Сильная зависимость от контрактов API

Сидер специально заточен под текущие особенности backend:

- `POST /types` и `POST /objects` не возвращают id в удобном виде;
- `/replacements/` требует неактивный replacement instance;
- long-running job нуждается в relogin.

Если API поменяется, первым делом нужно перепроверять `client.py` и batch resolve в `seed.py`.

## 14. Как расширять сидер

### Добавить новое устройство

Нужно:

1. добавить новый root `NodeSpec` в [`catalog.py`](./catalog.py);
2. проставить meaningful `tags`;
3. при необходимости добавить или уточнить event types.

### Добавить новый тип события

Нужно:

1. добавить `EventTypeSpec` в `EVENT_TYPES`;
2. при необходимости поставить `replacement=True`;
3. убедиться, что его `tags` приводят к нужной привязке к типам.

### Изменить набор свойств

Нужно править:

- `_property_templates(...)`
- `_object_property_value(...)`
- `_instance_property_value(...)`

Важно сохранять согласованность между именем property type и функцией генерации его значения.

## 15. Что проверять после изменений

Минимальный чек-лист:

1. `python3 -m compileall postgres/api_seeder`
2. `python3 -m postgres.api_seeder --dry-run --progress none --prefix some-prefix`
3. `python3 -m postgres.api_seeder --dry-run --progress text --prefix some-prefix`

Для end-to-end проверки:

1. поднять backend;
2. прогнать сидер с отдельным `--prefix`;
3. проверить counts в БД;
4. очистить окружение через `docker compose down -v`.

## 16. Возможные следующие улучшения

- retry/backoff на `429` и `5xx`;
- автоматический fallback `--progress tqdm -> text`, если `tqdm` не установлен;
- adaptive concurrency в зависимости от латентности API;
- отдельный режим "small seed" для быстрого интеграционного smoke-теста;
- сохранение чекпоинтов, чтобы можно было возобновлять длинный прогон.
