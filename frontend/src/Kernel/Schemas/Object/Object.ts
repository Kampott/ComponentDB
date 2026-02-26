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
        // Техническое поле, управляется сервером и не отправляется клиентом
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        name: {
            common: {
                label: 'Название',
                description: 'Название объекта',
            },
            create: { policy: 'required' },
            update: { policy: 'optional' },
            form: {
                input: 'text',
                validator: ObjectValidator.name,
            },
        },
        // Select заполняется динамически на основе внешнего контекста
        type_id: {
            common: {
                label: 'Тип объекта',
                description: 'Тип объекта',
            },
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
            read: {
                printValue: async (value, context) => {
                    const types = await useServicesStore
                        .getState()
                        .services.objectsTypesService.getTypesByParentId(
                            context.parentTypeId,
                        )
                    const selectedType = types.find(type => type.id === value)
                    return selectedType ? selectedType.name : String(value)
                },
            },
            form: {
                input: 'select',
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
        },
        parent_id: {
            common: {
                label: 'Родительский объект',
                description: 'ID родительского объекта',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.parentObjectId,
            },
            update: { policy: 'forbidden' },
            read: {
                printValue: async (value): Promise<string> => {
                    if (value === null) {
                        return 'Корневой объект'
                    }

                    try {
                        const objectService = useServicesStore.getState()
                            .services as unknown as {
                            objectService: {
                                read: (id: number) => Promise<{ name: string }>
                            }
                        }
                        const parentObject =
                            await objectService.objectService.read(value)
                        return parentObject.name
                    } catch {
                        return String(value)
                    }
                },
            },
            // Скрыто в UI, но автоматически включается в create payload
            form: { input: 'number' },
        },
        // Вычисляется на бэкенде и не редактируется клиентом
        root_id: {
            common: {
                label: 'Корневой объект',
                description: 'ID корневого объекта',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
    },
})

// DTO-типы автоматически выводятся из политик схемы выше
export type ObjectAdd = InferCreate<typeof objectSchema>
export type ObjectUpdate = InferUpdate<typeof objectSchema>
