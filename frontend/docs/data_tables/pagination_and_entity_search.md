# Feature: Pagination And Entity Search

## Purpose

Фича унифицирует базовую пагинацию списков и делает выбор связанных сущностей
удобным для пользователя за счёт поиска по имени вместо выбора по `id`.

## Scope

Входит:

- общий headless-хук пагинации
- общий UI пагинации
- внедрение пагинации в повторно используемые списки
- `search-select` для форм
- поиск существующих сущностей по имени в сценариях привязки

Не входит:

- полноценные data tables
- server-side пагинация
- relation cache на фронтенде

## Concepts

- `usePagination` — headless-состояние пагинации
- `PaginationControls` — единый UI переключения страниц
- `search-select` — form field, который хранит `value`, но ищет по `label`
- entity lookup by name — выбор сущности по отображаемому имени, а не по числовому `id`

## Public Behavior

Снаружи фича проявляется так:

- длинные списки больше не рендерятся единым полотном
- пользователь может выбирать типы и связанные сущности через поиск по имени
- диалоги привязки перестают зависеть от обычного `<select>` с длинным списком

## Interfaces / API

Основные точки входа:

- `src/lib/usePagination.ts`
- `src/React/Components/Common/PaginationControls.tsx`
- `src/React/Components/Common/Forms/SearchableSelect.tsx`
- `src/Kernel/Forms/FormTypes.ts`
- `src/EntityDsl/Ui/EntityFormGenerator.ts`
- `src/React/Components/Common/Forms/DefaultFormBase.tsx`

Использующие экраны:

- списки на базе `DefaultList`
- формы объектов и событий
- сценарии привязки типов событий и типов объектов

## Lifecycle / Flow

Типичный сценарий пагинации:

1. Экран передаёт массив данных в `usePagination`
2. Хук вычисляет текущую страницу и `visibleItems`
3. `PaginationControls` меняет страницу через headless-state
4. При изменении длины набора страница корректируется автоматически

Типичный сценарий выбора сущности:

1. UI-схема поля объявляет `search-select`
2. Генератор формы подготавливает `options`
3. Пользователь ищет по имени
4. В форму попадает `value`, пригодный для API

## Constraints / Invariants

- пагинация не должна храниться отдельно в каждом списке
- поиск по связанным сущностям должен быть частью form-system, а не локальным хаком
- `search-select` отображает `label`, но отдаёт `value`
- form generator не должен знать о конкретных экранах

## Failure Modes

- если список не проходит через общий слой, проект снова получает дублирование логики
- если `search-select` не получает актуальные `options`, пользователь не может выбрать нужную сущность
- если экран вручную хранит свою пагинацию, он отходит от общего UX

## Configuration

Фича настраивается через:

- `pageSize` в местах использования `usePagination`
- тип form field `search-select`
- источники `options`, которые прокидываются в UI-схемы

## Examples

Минимальный пример пагинации:

```ts
const { page, totalPages, visibleItems, setPage } = usePagination(items, 10)
```

Минимальный пример поля поиска по сущности:

```ts
{
    type: 'search-select',
    options: eventTypes.map(eventType => ({
        label: eventType.name,
        value: String(eventType.id),
    })),
}
```

## Non-goals

Фича не решает:

- сложную сортировку и фильтрацию таблиц
- server-driven list state
- визуализацию древовидных структур
