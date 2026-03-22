import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface Object {
    id: number
    name: string
    type_id: number
    parent_id: number | null
    root_id: number
}

export interface ObjectCreateContext {
    parentTypeId: number
    parentObjectId: number | null
}

/**
 * Схема сущности:
 * одна декларация управляет:
 * - статическими DTO-типами (ObjectAdd/ObjectUpdate)
 * - runtime-генерацией create-формы
 * - правилами на уровне поля (видимость/опции/дефолты/валидация)
 */
export const objectSchema = defineEntitySchema<Object, ObjectCreateContext>()({
    entity: 'Object',
    resource: 'objects',
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        name: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        type_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        parent_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        root_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
    },
})

// DTO-типы автоматически выводятся из политик схемы выше
export type ObjectAdd = InferCreate<typeof objectSchema>
export type ObjectUpdate = InferUpdate<typeof objectSchema>
