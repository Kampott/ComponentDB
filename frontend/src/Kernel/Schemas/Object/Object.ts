import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'
import { useServicesStore } from '@StorageImpl'
import { ObjectValidator } from './ObjectValidator.ts'

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
 * PoC-схема сущности:
 * одна декларация управляет:
 * - статическими DTO-типами (ObjectAdd/ObjectUpdate)
 * - runtime-генерацией create-формы
 * - правилами на уровне поля (видимость/опции/дефолты/валидация)
 */
export const objectSchema = defineEntitySchema<Object, ObjectCreateContext>()({
    entity: 'Object',
    resource: 'objects',
    fields: {
        // Техническое поле, управляется сервером и не отправляется клиентом
        id: {
            label: 'ID',
            description: 'Уникальный идентификатор',
            input: 'number',
            create: 'forbidden',
            update: 'forbidden',
            createVisible: false,
            updateVisible: false,
        },
        name: {
            label: 'Название',
            description: 'Название объекта',
            input: 'text',
            create: 'required',
            update: 'optional',
            validator: ObjectValidator.name,
        },
        // Select заполняется динамически на основе внешнего контекста
        type_id: {
            label: 'Тип объекта',
            description: 'Тип объекта',
            input: 'select',
            create: 'required',
            update: 'forbidden',
            options: async context => {
                const types = await useServicesStore
                    .getState()
                    .services.objectsTypesService.getTypesByParentId(
                        context.parentTypeId,
                    )

                return types.map(type => ({
                    label: type.name,
                    value: type.id,
                }))
            },
        },
        parent_id: {
            label: 'Родительский объект',
            description: 'ID родительского объекта',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            // Скрыто в UI, но автоматически включается в create payload
            createVisible: false,
            defaultValue: context => context.parentObjectId,
        },
        // Вычисляется на бэкенде и не редактируется клиентом
        root_id: {
            label: 'Корневой объект',
            description: 'ID корневого объекта',
            input: 'number',
            create: 'forbidden',
            update: 'forbidden',
            createVisible: false,
            updateVisible: false,
        },
    },
})

// DTO-типы автоматически выводятся из политик схемы выше
export type ObjectAdd = InferCreate<typeof objectSchema>
export type ObjectUpdate = InferUpdate<typeof objectSchema>
