import { roleSchema } from '@Schemas'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const roleUiSchema = defineEntityUiSchema<typeof roleSchema>()({
    entity: 'Role',
    fields: {
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор роли',
            },
            create: { visible: false },
            update: { visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        name: {
            common: {
                label: 'Название',
                description: 'Название роли',
            },
            form: {
                input: 'text',
                validator: value => {
                    if (!value || value.trim().length === 0) {
                        return 'Название не может быть пустым'
                    }
                    return null
                },
            },
        },
        description: {
            common: {
                label: 'Описание',
                description: 'Описание роли',
            },
            create: {
                defaultValue: () => '',
            },
            form: { input: 'text' },
        },
    },
})
