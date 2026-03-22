import { objectSchema, ObjectValidator } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const objectUiSchema = defineEntityUiSchema<typeof objectSchema>()({
    entity: 'Object',
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
                description: 'Название объекта',
            },
            form: {
                input: 'text',
                validator: ObjectValidator.name,
            },
        },
        type_id: {
            common: {
                label: 'Тип объекта',
                description: 'Тип объекта',
            },
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
                visible: false,
                defaultValue: context => context.parentObjectId,
            },
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
            form: { input: 'number' },
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
