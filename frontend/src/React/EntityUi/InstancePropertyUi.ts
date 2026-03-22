import { instancePropertySchema } from '@Schemas'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const instancePropertyUiSchema = defineEntityUiSchema<
    typeof instancePropertySchema
>()({
    entity: 'InstanceProperty',
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
        value: {
            common: {
                label: 'Значение',
                description: 'Значение свойства экземпляра',
            },
            form: { input: 'text' },
        },
        instance_id: {
            common: {
                label: 'ID экземпляра',
                description: 'Идентификатор связанного экземпляра',
            },
            create: {
                visible: false,
                defaultValue: context => context.instanceId,
            },
            form: { input: 'number' },
        },
    },
})
