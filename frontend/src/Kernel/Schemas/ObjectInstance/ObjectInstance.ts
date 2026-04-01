import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface ObjectInstance {
    id: number
    name: string
    object_id: number
    parent_id: number | null
    is_active: boolean
    root_id: number
}

export interface ObjectInstanceCreateContext {
    objectId: number
    parentId?: number | null
    defaultIsActive?: boolean
}

export const objectInstanceSchema = defineEntitySchema<
    ObjectInstance,
    ObjectInstanceCreateContext
>()({
    entity: 'ObjectInstance',
    resource: 'instances',
    query: {
        name: ['exact', 'like', 'in', 'sort'],
        object_id: ['exact', 'in', 'gte', 'lte'],
        parent_id: ['exact', 'in'],
        root_id: ['exact', 'in'],
        is_active: ['exact'],
        id: ['exact', 'in', 'gte', 'lte', 'sort'],
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
        object_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        parent_id: {
            create: { policy: 'optional' },
            update: { policy: 'optional' },
        },
        is_active: {
            create: { policy: 'optional' },
            update: { policy: 'optional' },
        },
        root_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
    },
})

export type ObjectInstanceAdd = InferCreate<typeof objectInstanceSchema>
export type ObjectInstanceUpdate = InferUpdate<typeof objectInstanceSchema>
