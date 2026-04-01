# Feature: Data Tables

## Purpose

Фича вводит единый табличный слой для списков, который поддерживает сортировку,
фильтрацию, пагинацию, видимость колонок и постепенный переход от client-side к
server-driven загрузке.

## Scope

Входит:

- headless-state таблицы
- schema-слой колонок
- общий table component
- toolbar и compact-toolbar
- filter builder
- server-driven интеграция через `state.query`
- контекстные меню и row actions для табличных списков
- режимы отображения действий `material/text`

Не входит:

- backend server-side pagination
- OR-группы и сложные filter expressions
- relation-aware search на backend

## Concepts

- `useDataTableState` — headless-состояние таблицы
- `DataTableColumnSchema` — metadata табличного представления
- `processingMode='client'` — фильтрация и сортировка на клиенте
- `processingMode='manual'` — таблица показывает уже загруженный сервером набор
- full toolbar — расширенный toolbar с поиском
- compact toolbar — минималистичный toolbar для простых списков
- action display mode — режим `material` или `text` для toolbar-действий

## Public Behavior

Снаружи фича проявляется так:

- списки выглядят и работают единообразно
- таблицы умеют скрывать колонки, фильтровать и сортировать данные
- часть экранов использует полный toolbar, часть — compact
- действия в toolbar можно переключать между иконками и иконками с подписями
- ширина и layout таблиц на страницах теперь регулируются системно, а не локальными хаками

## Interfaces / API

Основные точки входа:

- `src/lib/useDataTableState.ts`
- `src/lib/dataTableSchema.ts`
- `src/React/Components/Common/DataTable.tsx`
- `src/React/Components/Common/DataTableToolbar.tsx`
- `src/React/Components/Common/CompactDataTableToolbar.tsx`
- `src/React/Components/Common/DataTableFilters.tsx`
- `src/React/Components/Common/DataTablePageSizeControl.tsx`
- `src/React/Components/Common/ToolbarActionButton.tsx`

Container-level интеграции:

- `src/React/Components/Pages/EventsPage/EventsSection.tsx`
- `src/React/Components/Pages/EventsPage/EventTypesSection.tsx`
- `src/React/Components/Pages/TypePage/TypeObjectsTab.tsx`
- `src/React/Components/Pages/TypePage/TypeEventTypesTab.tsx`
- `src/React/Components/Pages/ObjectPage/ObjectInstancesTab.tsx`

## Lifecycle / Flow

Типичный сценарий:

1. Экран описывает колонки через `DataTableColumnSchema`
2. Экран создаёт `useDataTableState({ schema, columns, ... })`
3. Из состояния собирается `state.query`
4. Container передаёт `state.query` в сервисный слой
5. `DataTable` рендерит уже загруженные строки и управляет локальной пагинацией текущего набора
6. Toolbar и filter UI работают поверх того же `state`

## Constraints / Invariants

- источник правды по допустимым query-операциям — `schema.query`
- container отвечает за загрузку данных, а не сама таблица
- column metadata не должна дублировать backend-контракт, а только дополнять его UI-описанием
- compact-toolbar используется там, где отдельный search UI не нужен
- режим действий `material/text` хранится глобально в `UserStore`

## Failure Modes

- если экран хранит list-state локально вне `useDataTableState`, он выпадает из общего поведения
- если колонка не привязана к `queryField`, её нельзя корректно сортировать или фильтровать
- если server-driven список использует только отфильтрованный набор для relation-dialog, пользователь может увидеть ложные доступные связи
- без backend pagination длинные выборки всё ещё могут быть тяжёлыми

## Configuration

Основные настройки:

- `defaultPageSize`
- `defaultSorting`
- `pageSizeOptions`
- `processingMode`
- `visibleByDefault`, `hideable`
- `filter.variant`, `filter.operators`
- `UserStore.actionDisplayMode`

## Examples

Минимальный контейнерный сценарий:

```ts
const tableState = useDataTableState({
    schema: objectSchema,
    columns,
    defaultPageSize: 10,
    defaultSorting: { field: 'name', direction: 'asc' },
})

const rows = await services.objectService.list({
    ...tableState.query,
    type_id: currentType.id,
})
```

Пример compact-toolbar:

```tsx
<CompactDataTableToolbar state={tableState} columns={columns} />
```

Пример toolbar action, зависящего от `material/text`:

```tsx
<ToolbarActionButton
    icon={<Plus />}
    label='Добавить'
    onClick={handleAdd}
/>
```

## Current Coverage

На текущий момент на data tables переведены:

- события
- типы событий и их привязки к типам объектов
- список объектов у типа
- список экземпляров у объекта

Дополнительно реализованы:

- compact-toolbar для простых таблиц
- ручной ввод количества строк на страницу
- контекстные действия `view/edit/add/delete` там, где сценарий этого требует
- переключение toolbar-действий между `material` и `text`

## Non-goals

Фича пока не решает:

- полноценную server-side пагинацию с `total`
- backend aggregation / facets
- tree-view структуры через тот же плоский table layer
