import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'
import { useServicesStore } from '@StorageImpl'
import { ObjectInstanceValidator } from './ObjectInstanceValidator.ts'

export interface ObjectInstance {
    id: number
    name: string
    object_id: number
    parent_id: number | null
    is_active: boolean
    root_id: number
}

export interface ObjectInstanceCreateContext {
    objectId: number
    parentId?: number | null
    defaultIsActive?: boolean
}

export const objectInstanceSchema = defineEntitySchema<
    ObjectInstance,
    ObjectInstanceCreateContext
>()({
    entity: 'ObjectInstance',
    resource: 'instances',
    fields: {
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
                description: 'Название экземпляра объекта',
            },
            create: { policy: 'required' },
            update: { policy: 'optional' },
            form: {
                input: 'text',
                validator: ObjectInstanceValidator.name,
            },
        },
        object_id: {
            common: {
                label: 'Объект',
                description: 'Объект экземпляра',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.objectId,
            },
            update: { policy: 'forbidden' },
            form: { input: 'number' },
        },
        parent_id: {
            common: {
                label: 'Родительский экземпляр',
                description: 'ID родительского экземпляра',
            },
            create: {
                policy: 'optional',
                visible: false,
                defaultValue: context => context.parentId ?? null,
            },
            update: { policy: 'optional' },
            read: {
                printValue: async (value): Promise<string> => {
                    if (value === null) {
                        return 'Корневой экземпляр'
                    }

                    try {
                        const instanceService = useServicesStore.getState()
                            .services as unknown as {
                            objectsInstancesService: {
                                read: (id: number) => Promise<{ name: string }>
                            }
                        }
                        const parentInstance =
                            await instanceService.objectsInstancesService.read(
                                value,
                            )
                        return parentInstance.name
                    } catch {
                        return String(value)
                    }
                },
            },
            form: { input: 'number' },
        },
        is_active: {
            common: {
                label: 'Активен',
                description: 'Статус активности экземпляра',
            },
            create: {
                policy: 'optional',
                defaultValue: context => context.defaultIsActive ?? true,
            },
            update: { policy: 'optional' },
            form: { input: 'boolean' },
        },
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

export type ObjectInstanceAdd = InferCreate<typeof objectInstanceSchema>
export type ObjectInstanceUpdate = InferUpdate<typeof objectInstanceSchema>
