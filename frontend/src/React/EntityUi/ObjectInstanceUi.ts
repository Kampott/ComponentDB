import { objectInstanceSchema, ObjectInstanceValidator } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const objectInstanceUiSchema = defineEntityUiSchema<
    typeof objectInstanceSchema
>()({
    entity: 'ObjectInstance',
    fields: {
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { visible: false },
            update: { visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        name: {
            common: {
                label: 'Название',
                description: 'Название экземпляра объекта',
            },
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
                visible: false,
                defaultValue: context => context.objectId,
            },
            form: { input: 'number' },
        },
        parent_id: {
            common: {
                label: 'Родительский экземпляр',
                description: 'ID родительского экземпляра',
            },
            create: {
                visible: false,
                defaultValue: context => context.parentId ?? null,
            },
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
                defaultValue: context => context.defaultIsActive ?? true,
            },
            form: { input: 'boolean' },
        },
        root_id: {
            common: {
                label: 'Корневой объект',
                description: 'ID корневого объекта',
            },
            create: { visible: false },
            update: { visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
    },
})
