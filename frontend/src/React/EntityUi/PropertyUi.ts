import { propertySchema } from '@Schemas'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const propertyUiSchema = defineEntityUiSchema<typeof propertySchema>()({
    entity: 'Property',
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
        property_id: {
            common: {
                label: 'Свойство',
                description: 'Выберите свойство',
            },
            create: {
                visible: false,
                defaultValue: context => context.propertyTypeId,
            },
            form: { input: 'number' },
        },
        value: {
            common: {
                label: 'Значение',
                description: 'Значение свойства',
            },
            form: { input: 'text' },
        },
        object_id: {
            common: {
                label: 'Объект',
                description: 'Выберите объект',
            },
            create: {
                visible: false,
                defaultValue: context => context.objectId,
            },
            form: { input: 'number' },
        },
    },
})
