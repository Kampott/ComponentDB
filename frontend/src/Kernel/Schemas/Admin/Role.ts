import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface Role {
    id: number
    name: string
    description: string
}

export type RoleCreateContext = Record<string, never>

export const roleSchema = defineEntitySchema<Role, RoleCreateContext>()({
    entity: 'Role',
    resource: 'roles',
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

export type RoleAdd = InferCreate<typeof roleSchema>
export type RoleUpdate = InferUpdate<typeof roleSchema>
