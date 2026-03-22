import { objectTypeSchema, ObjectTypeValidator } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const objectTypeUiSchema = defineEntityUiSchema<
    typeof objectTypeSchema
>()({
    entity: 'ObjectType',
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
                description: 'Название типа объекта',
            },
            form: {
                input: 'text',
                validator: ObjectTypeValidator.name,
            },
        },
        parent_id: {
            common: {
                label: 'Родительский тип',
                description: 'ID родительского типа',
            },
            create: {
                visible: false,
                defaultValue: context => context.parentTypeId,
            },
            read: {
                printValue: async (value): Promise<string> => {
                    if (value === null) {
                        return 'Корневой тип'
                    }

                    try {
                        const typeService = useServicesStore.getState()
                            .services as unknown as {
                            objectsTypesService: {
                                read: (id: number) => Promise<{ name: string }>
                            }
                        }
                        const parentType =
                            await typeService.objectsTypesService.read(value)
                        return parentType.name
                    } catch {
                        return String(value)
                    }
                },
            },
            form: { input: 'number' },
        },
        root_id: {
            common: {
                label: 'Корневой тип',
                description: 'ID корневого типа',
            },
            create: { visible: false },
            update: { visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
    },
})
