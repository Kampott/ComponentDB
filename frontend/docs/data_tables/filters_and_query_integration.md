# Feature: Filters And Query Integration

## Purpose

Фича делает list-запросы на фронтенде типизированными и согласованными с
backend query-параметрами.

Её задача:

- поддержать новые backend-операторы фильтрации и сортировки
- убрать ручные `Record<string, ...>` query-типы из сервисов
- подготовить metadata-слой, из которого потом можно собирать UI фильтров

## Scope

Входит:

- описание query-возможностей в схемах сущностей
- вывод типизированного `list(query)` из схемы
- корректная сериализация массивов, дат и boolean в HTTP-клиенте
- поддержка query-only полей, которых нет в DTO

Не входит:

- автоматическая генерация всех фильтров на экране
- сложные backend-условия вроде OR-групп
- транзитивный поиск по связанным display-полям

## Concepts

- `schema.query` — описание допустимых query-полей и операторов для list-эндпоинта
- query-only field — фильтр, существующий в API, но отсутствующий в DTO сущности
- `InferListQuery<typeof schema>` — выведенный тип query-параметров для `list(...)`
- transport serialization — преобразование query-параметров в строку запроса

## Public Behavior

Снаружи фича проявляется так:

- сервисы принимают типизированные query-параметры
- фронтенд может безопасно передавать `__like`, `__in`, `__gte`, `__lte`, `__gt`, `__lt`, `__sort`
- массивы для `__in` сериализуются в формате, который ожидает FastAPI
- UI-слой может опираться на `schema.query`, а не на вручную собранные списки полей

## Interfaces / API

Основные точки входа:

- `src/EntityDsl/Core/*`
- `src/Kernel/Schemas/*`
- `src/Rest/Services/EntityCrudService.ts`
- `src/Interfaces/Services/*`
- `src/Rest/AxiosClient.ts`

Ключевые сущности:

- `EntityQueryOperator`
- `EntityQueryValue`
- `InferListQuery<S>`
- `defineEntitySchema(...).query`

## Lifecycle / Flow

Типичный сценарий:

1. Схема сущности описывает разрешённые query-поля в `query`
2. Из схемы автоматически выводится тип `InferListQuery<typeof schema>`
3. Сервисный слой принимает только допустимые query-параметры
4. HTTP-клиент сериализует их в backend-совместимый формат
5. Дальше этот же metadata-слой может использовать UI таблиц и фильтров

## Constraints / Invariants

- query-операции не должны смешиваться с `fields` сущности
- query-only параметры должны жить в `schema.query`, даже если их нет в DTO
- `__in` всегда передаётся как повторяющийся ключ, а не `field[]=...`
- `Date` сериализуется в ISO-формат
- базовый CRUD-сервис должен выводить query-тип из схемы, а не принимать `any`

## Failure Modes

- если поле не описано в `schema.query`, фронтенд не сможет безопасно его передать
- если сериализация массива сломана, backend не примет `__in`
- если backend добавляет новый фильтр, а схема не обновлена, фронт отстаёт по возможностям
- если query-only поле ошибочно добавить в `fields`, это искажает модель сущности

## Configuration

Фича управляется:

- схемами в `src/Kernel/Schemas/*`
- общим query-типом в `src/EntityDsl/Core/*`
- `paramsSerializer` в `src/Rest/AxiosClient.ts`

## Examples

Примеры допустимых запросов:

```ts
await services.objectService.list({
    name__like: 'насос',
    id__in: [1, 2, 3],
    id__sort: 'asc',
})

await services.eventsService.list({
    timestamp__gte: new Date('2025-01-01T00:00:00.000Z'),
    timestamp__lte: new Date('2025-01-31T23:59:59.999Z'),
})
```

Пример query-only поля:

```ts
await services.objectsTypesService.list({
    event_type_id: 12,
})
```

## Non-goals

Фича не решает:

- построение сложного filter builder на backend
- relation-aware поиск по связанным сущностям
- server-side пагинацию
