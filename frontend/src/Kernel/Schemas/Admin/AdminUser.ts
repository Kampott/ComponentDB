import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface AdminUser {
    id: number
    email: string
    level: number
    is_active: boolean
}

export type AdminUserCreateContext = Record<string, never>

export const adminUserSchema = defineEntitySchema<
    AdminUser,
    AdminUserCreateContext
>()({
    entity: 'AdminUser',
    resource: 'admin/users',
    query: {
        id: ['exact', 'in', 'sort'],
        email: ['exact', 'like', 'sort'],
        level: ['exact', 'gte', 'lte', 'sort'],
    },
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        email: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        level: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        is_active: {
            create: { policy: 'optional' },
            update: { policy: 'optional' },
        },
    },
})

export type AdminUserAdd = InferCreate<typeof adminUserSchema>
export type AdminUserUpdate = InferUpdate<typeof adminUserSchema>
