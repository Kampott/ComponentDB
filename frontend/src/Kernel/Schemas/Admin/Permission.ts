import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface Permission {
    id: number
    name: string
    description: string
}

export type PermissionCreateContext = Record<string, never>

export const permissionSchema = defineEntitySchema<
    Permission,
    PermissionCreateContext
>()({
    entity: 'Permission',
    resource: 'permissions',
    query: {
        id: ['exact', 'in', 'sort'],
        name: ['exact', 'like', 'sort'],
    },
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        name: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        description: {
            create: { policy: 'optional' },
            update: { policy: 'optional' },
        },
    },
})

export type PermissionAdd = InferCreate<typeof permissionSchema>
export type PermissionUpdate = InferUpdate<typeof permissionSchema>
