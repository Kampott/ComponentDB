import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface ObjectType {
    id: number
    name: string
    parent_id: number | null
    root_id: number
}

export interface ObjectTypeCreateContext {
    parentTypeId: number | null
}

export interface ObjectTypeQuery {
    id: number
    name: string
    parent_id: number
    root_id: number
    event_type_id: number
}

export const objectTypeSchema = defineEntitySchema<
    ObjectType,
    ObjectTypeCreateContext,
    ObjectTypeQuery
>()({
    entity: 'ObjectType',
    resource: 'types',
    query: {
        name: ['exact', 'like', 'sort'],
        parent_id: ['exact', 'in'],
        root_id: ['exact', 'in'],
        id: ['exact', 'in', 'gte', 'lte', 'sort'],
        event_type_id: ['exact'],
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
        parent_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        root_id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
    },
})

export type ObjectTypeAdd = InferCreate<typeof objectTypeSchema>
export type ObjectTypeUpdate = InferUpdate<typeof objectTypeSchema>
