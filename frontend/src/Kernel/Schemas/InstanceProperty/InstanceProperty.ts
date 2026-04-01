import type { HasId } from '@EntityDsl/Core'
import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface InstanceProperty extends HasId {
    value: string
    instance_id: number
}

export interface InstancePropertyCreateContext {
    instanceId: number
}

export interface InstancePropertyQuery {
    id: number
    value: string
    instance_id: number
    property_type_id: number
}

export const instancePropertySchema = defineEntitySchema<
    InstanceProperty,
    InstancePropertyCreateContext,
    InstancePropertyQuery
>()({
    entity: 'InstanceProperty',
    resource: 'instanceproperties',
    query: {
        instance_id: ['exact', 'in'],
        property_type_id: ['exact', 'in'],
        value: ['exact', 'like'],
        id: ['exact', 'in', 'sort'],
    },
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        value: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        instance_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
    },
})

export type InstancePropertyAdd = InferCreate<typeof instancePropertySchema>
export type InstancePropertyUpdate = InferUpdate<typeof instancePropertySchema>
