import { permissionSchema } from '@Schemas'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const permissionUiSchema = defineEntityUiSchema<
    typeof permissionSchema
>()({
    entity: 'Permission',
    fields: {
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор права',
            },
            create: { visible: false },
            update: { visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        name: {
            common: {
                label: 'Код',
                description: 'Уникальный код права доступа',
            },
            form: {
                input: 'text',
                validator: value => {
                    if (!value || value.trim().length === 0) {
                        return 'Код не может быть пустым'
                    }
                    return null
                },
            },
        },
        description: {
            common: {
                label: 'Описание',
                description: 'Описание права доступа',
            },
            create: {
                defaultValue: () => '',
            },
            form: { input: 'text' },
        },
    },
})
