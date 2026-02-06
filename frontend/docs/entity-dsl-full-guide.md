# Entity DSL: полная документация

---

## 1. Цель новой архитектуры

Сделать **один источник правды** для каждой сущности:

- из него автоматически выводятся типы DTO;
- из него автоматически строятся Add/Edit формы;
- страницы используют единый `AddEntityForm` и единый `EditEntityForm` inline.

---

## 2. Ключевые файлы

- DSL ядро: `src/LayerKernel/Schemas/EntityDsl.ts`
- Генератор форм: `src/LayerKernel/Forms/EntityFormGenerator.ts`
- Общая add-форма: `src/LayerReact/Components/Forms/AddEntityForm.tsx`
- Общая edit-форма: `src/LayerReact/Components/Forms/EditEntityForm.tsx`

Схемы сущностей:

- `src/LayerKernel/Schemas/Object/Object.ts`
- `src/LayerKernel/Schemas/ObjectType/ObjectType.ts`
- `src/LayerKernel/Schemas/PropertyType/PropertyType.ts`
- `src/LayerKernel/Schemas/Property/Property.ts`
- `src/LayerKernel/Schemas/ObjectInstance/ObjectInstance.ts`
- `src/LayerKernel/Schemas/InstanceProperty/InstanceProperty.ts`

---

## 3. DSL-контракт

### 3.1. Политики

- `create: 'required' | 'optional' | 'forbidden'`
- `update: 'optional' | 'forbidden'`

Они управляют типами DTO.

### 3.2. Описание поля

Каждое поле в DSL хранит:

- UI-мета: `label`, `description`, `input`
- API-политики: `create`, `update`
- видимость по режимам: `createVisible`, `updateVisible`
- runtime-расширения:
    - `validator(value)`
    - `options(context)`
    - `defaultValue(context)`

### 3.3. Контекст

Каждая схема имеет тип `Context`:

- нужен для вычисляемых значений (`defaultValue`) и асинхронных опций (`options`);
- передается в `AddEntityForm`/`EditEntityForm` из страницы;
- это заменяет ручные `optionsArgs/defaultValuesArgs`.

Пример: `ObjectCreateContext` содержит `parentTypeId` и `parentObjectId`.

---

## 4. Типы, которые выводятся автоматически

В `EntityDsl.ts` для схемы `S` выводятся:

- `InferEntity<S>`: базовый entity type (например, `ObjectType`)
- `InferCreate<S>`: DTO для create
- `InferUpdate<S>`: DTO для update

### 4.1. Как собирается `InferCreate<S>`

Логика:

- все поля с `create: 'required'` становятся обязательными;
- поля с `create: 'optional'` становятся опциональными;
- `create: 'forbidden'` исключаются.

### 4.2. Как собирается `InferUpdate<S>`

Логика:

- только поля с `update: 'optional'` попадают в тип;
- все они опциональные;
- `update: 'forbidden'` исключаются.

### 4.3. Почему есть `Flatten<T>`

`Flatten` нормализует пересечения типов вида:

`A & B` -> плоский объектный тип.

Это улучшает читаемость hover-подсказок и сообщения компилятора.

---

## 5. Runtime-генерация форм

Файл: `EntityFormGenerator.ts`.

### 5.1. `generateCreateFormFromSchema(...)`

Что делает:

1. Берет ключи create-полей (`getCreateFieldKeys`).
2. Для каждого поля:
    - подгружает `options(context)`, если есть;
    - вычисляет default-значения;
    - создает `FormField`.
3. Возвращает:
    - `formFields`
    - `defaultData` (payload-объект)

Порядок приоритета default:

1. `defaults` из вызова формы;
2. `field.defaultValue(context)`;
3. первый элемент `options`, если есть.

### 5.2. `generateUpdateFormFromSchema(...)`

Что делает:

1. Берет ключи update-полей (`getUpdateFieldKeys`).
2. Prefill из `source` (текущей сущности).
3. Применяет `defaults` (имеют приоритет).
4. Подтягивает `options/defaultValue` как fallback.
5. Строит `formFields` для update-режима.

### 5.3. Почему нужен `parser`

DOM для `<select>` возвращает строку.

Если option value = `number` или `boolean`, строка должна вернуться в тип поля.
Для этого:

- генератор прикрепляет `parser`,
- `DefaultFormBase` использует `parser` с приоритетом над fallback-конвертацией.

---

## 6. Общие компоненты форм

### 6.1. `AddEntityForm`

Назначение:

- единый modal-компонент для create.

Принимает:

- `schema`
- `context`
- `defaults?`
- `title`
- `submitCallback(data | null)`

`data` типизирован как `InferCreate<typeof schema>`.

### 6.2. `EditEntityForm`

Назначение:

- единый modal-компонент для update.

Принимает:

- `schema`
- `context`
- `source` (текущая сущность, откуда префилл)
- `defaults?`
- `title`
- `submitCallback(data | null)`

`data` типизирован как `InferUpdate<typeof schema>`.

---

## 7. Слой REST-типов

Сервисы больше не используют `SchemaAdd<T>`.

Теперь контракты завязаны на DSL-вывод:

- `ObjectAdd`, `ObjectUpdate`
- `ObjectTypeAdd`, `ObjectTypeUpdate`
- `PropertyTypeAdd`, `PropertyTypeUpdate`
- `PropertyAdd`, `PropertyUpdate`
- `ObjectInstanceAdd`, `ObjectInstanceUpdate`
- `InstancePropertyAdd`, `InstancePropertyUpdate`

Это устраняет рассинхрон между метой и API-типами.

---

## 8. Текущие сущности и их контексты

### 8.1. Object

Файл: `src/LayerKernel/Schemas/Object/Object.ts`

Контекст:

- `parentTypeId: number`
- `parentObjectId: number | null`

Update-редактируемые поля:

- `name`

### 8.2. ObjectType

Файл: `src/LayerKernel/Schemas/ObjectType/ObjectType.ts`

Контекст:

- `parentTypeId: number | null`

Update-редактируемые поля:

- `name`

### 8.3. PropertyType

Файл: `src/LayerKernel/Schemas/PropertyType/PropertyType.ts`

Контекст:

- `objectTypeId: number`
- `defaultIsStatic?: boolean`

Update-редактируемые поля:

- `name`
- `is_static`

### 8.4. Property

Файл: `src/LayerKernel/Schemas/Property/Property.ts`

Контекст:

- `propertyTypeId: number`
- `objectId: number`

Update-редактируемые поля:

- `value`

### 8.5. ObjectInstance

Файл: `src/LayerKernel/Schemas/ObjectInstance/ObjectInstance.ts`

Контекст:

- `objectId: number`
- `parentId?: number | null`
- `defaultIsActive?: boolean`

Update-редактируемые поля:

- `name`
- `parent_id`
- `is_active`

### 8.6. InstanceProperty

Файл: `src/LayerKernel/Schemas/InstanceProperty/InstanceProperty.ts`

Контекст:

- `instanceId: number`

Update-редактируемые поля:

- `value`

---

## 9. Поведение скрытых полей

Флаги:

- `createVisible: false`
- `updateVisible: false`

Важный момент:

- скрытое поле **не рендерится** в форме,
- но может попасть в payload через:
    - `defaults`,
    - `defaultValue(context)`,
    - prefill из `source` (для update).

Это позволяет держать служебные поля вне UI, но в request payload.

---

## 10. Практический шаблон добавления новой сущности

1. Создать `X.ts` в `LayerKernel/Schemas/...`:
    - `interface X`
    - `interface XCreateContext`
    - `xSchema = defineEntitySchema<X, XCreateContext>()({...})`
    - `type XAdd = InferCreate<typeof xSchema>`
    - `type XUpdate = InferUpdate<typeof xSchema>`
2. Обновить сервисы:
    - `addX(payload: XAdd)`
    - `updateX(id, payload: XUpdate)`
3. На странице:
    - для add: `AddEntityForm`
    - для edit: `EditEntityForm`
4. Передавать корректный `context`.
5. При submit вызывать нужный сервис и перезагружать список/дерево.

---

## 11. Частые ошибки и как избегать

1. Неверный `context`:
    - если поле использует `defaultValue/options`, контекст обязателен.
2. Поле не отображается:
    - проверить `createVisible`/`updateVisible`.
3. Неправильный тип value из `<select>`:
    - проверять, что option values задан в нужном типе (`number`, `boolean`).
    - parser генерируется автоматически.
4. Лишние поля в update:
    - `InferUpdate` не включает forbidden-поля, использовать только его.
5. Неполный payload create:
    - `required` поля должны быть либо в форме, либо заполняться default’ами.

---

## 12. Минимальный пример использования

```tsx
<AddEntityForm
    schema={objectTypeSchema}
    context={{parentTypeId: currentType.id}}
    defaults={{name: ''}}
    title='Добавление типа'
    submitCallback={async data => {
        if (!data) return
        await services.objectsTypesService.addType(data)
        await reload()
    }}
/>
```

```tsx
<EditEntityForm
    schema={objectTypeSchema}
    context={{parentTypeId: editTarget.parent_id}}
    source={editTarget}
    title={`Изменение типа "${editTarget.name}"`}
    submitCallback={async data => {
        if (!data) return
        await services.objectsTypesService.updateType(editTarget.id, data)
        await reload()
    }}
/>
```
