import { adminUserSchema } from '@Schemas'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const adminUserUiSchema = defineEntityUiSchema<typeof adminUserSchema>()(
    {
        entity: 'AdminUser',
        fields: {
            id: {
                common: {
                    label: 'ID',
                    description: 'Уникальный идентификатор пользователя',
                },
                create: { visible: false },
                update: { visible: false },
                read: { visible: false },
                form: { input: 'number' },
            },
            email: {
                common: {
                    label: 'Email',
                    description: 'Адрес электронной почты',
                },
                form: {
                    input: 'text',
                    validator: value => {
                        if (!value || value.trim().length === 0) {
                            return 'Email не может быть пустым'
                        }
                        return null
                    },
                },
            },
            level: {
                common: {
                    label: 'Уровень',
                    description: 'Уровень доступа пользователя',
                },
                create: { visible: false },
                update: { visible: false },
                read: { visible: false },
                form: { input: 'number' },
            },
            is_active: {
                common: {
                    label: 'Активен',
                    description: 'Статус активности пользователя',
                },
                create: {
                    defaultValue: () => true,
                },
                read: {
                    printValue: value => (value ? 'Да' : 'Нет'),
                },
                form: { input: 'boolean' },
            },
        },
    },
)
