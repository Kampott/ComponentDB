import { propertyTypeSchema, PropertyTypeValidator } from '@Schemas'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const propertyTypeUiSchema = defineEntityUiSchema<
    typeof propertyTypeSchema
>()({
    entity: 'PropertyType',
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
        type_id: {
            common: {
                label: 'Тип объекта',
                description: 'Тип, к которому относится это свойство',
            },
            create: {
                visible: false,
                defaultValue: context => context.objectTypeId,
            },
            form: { input: 'number' },
        },
        is_static: {
            common: {
                label: 'Привязано к',
                description:
                    'Если задано, то свойство относится к типу. Иначе - к экземпляру',
            },
            create: {
                defaultValue: context => context.defaultIsStatic ?? true,
            },
            read: {
                printValue: value => (value ? 'Объекту' : 'Экземпляру'),
            },
            form: {
                input: 'select',
                options: () => [
                    { label: 'Объекту', value: true },
                    { label: 'Экземпляру', value: false },
                ],
            },
        },
        name: {
            common: {
                label: 'Название',
                description: 'Название типа свойства',
            },
            form: {
                input: 'text',
                validator: PropertyTypeValidator.name,
            },
        },
    },
})
