# Dev Notes: `Event.info` as key-value object

## Context

`Event.info` реализовано как:

- `Record<string, unknown> | null`

Для него добавлена отдельная schema-driven поддержка, чтобы:

- в add/edit форме работать со словарём как с набором полей;
- в view-режиме отображать словарь как список `key/value`;
- не хардкодить special-case только под `Event`.

## Implementation

### 1. New DSL input type

В общий DSL добавлен новый тип поля:

- `kv-object`

Файлы:

- `src/Kernel/Schemas/EntityDsl.ts`
- `src/Kernel/Forms/FormTypes.ts`

Это позволяет объявлять словарь как обычное поле схемы сущности.

## 2. Form rendering

В базовой форме `DefaultFormBase` добавлен отдельный рендерер для `kv-object`.

Файл:

- `src/React/Components/Common/Forms/DefaultFormBase.tsx`

Используется компонент:

- `src/React/Components/Common/Forms/KeyValueObjectEditor.tsx`

Поведение редактора:

- каждая строка содержит `key` и `value`;
- можно добавлять строки;
- можно удалять строки;
- пустые строки без ключа не попадают в итоговый payload;
- дубликаты ключей считаются ошибкой формы.

Текущая модель значений:

- все `value` сохраняются как строки;
- вложенные структуры в редакторе специально не поддерживаются;
- если в source уже пришёл нестроковый value, он приводится к строке для редактирования.

## 3. Read rendering

Read-view больше не ограничен только строками.

Файл:

- `src/Kernel/Forms/EntityFormGenerator.ts`

`ReadViewField.value` теперь хранит `ReactNode`, а не только `string`.

Для словаря используется отдельный компонент:

- `src/React/Components/Common/Forms/KeyValueObjectView.tsx`

Он показывает:

- пустой словарь как `—`;
- примитивные значения как строку;
- объект/массив как `JSON.stringify(..., null, 2)`.

## 4. Event schema hookup

`Event.info` подключён к новой инфраструктуре в:

- `src/Kernel/Schemas/Event/Event.ts`

Сейчас поле:

- видно в create;
- видно в update;
- видно в read;
- использует `form.input = 'kv-object'`.

## 5. Validation model

На текущем этапе validation минимальная:

- ключ не должен быть пустым;
- ключи не должны повторяться.

Глубокой типизации `unknown` пока нет.

## 6. Important bugfix

При первой реализации возник бесконечный re-render в edit-форме.

Причина:

- `KeyValueObjectEditor` держал `useEffect(..., [rows, onChange, onErrorChange])`;
- `DefaultFormBase` передавал `onChange/onErrorChange` как inline callbacks;
- на каждом render ссылки на callbacks менялись;
- effect снова вызывал `setData/setErrors` в родителе;
- это запускало новый render и замыкало цикл.

Исправление:

- в `KeyValueObjectEditor` callbacks сохранены в `ref`;
- эффект нормализации зависит только от `rows`.

Это важно сохранить, если редактор будут дальше расширять.

## 7. Known limitations

- значения пока редактируются только как строки;
- нет отдельного type selector для `string/number/boolean/null`;
- нет drag-and-drop или сортировки пар;
- нет поддержки вложенного редактирования объектов.

Если понадобится расширение, следующий безопасный шаг:

1. добавить тип значения на строку редактора;
2. конвертировать `value` из строки в выбранный primitive type;
3. только после этого думать о nested object editor.
