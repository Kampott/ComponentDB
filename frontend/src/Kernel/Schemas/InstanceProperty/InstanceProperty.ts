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

export const instancePropertySchema = defineEntitySchema<
    InstanceProperty,
    InstancePropertyCreateContext
>()({
    entity: 'InstanceProperty',
    resource: 'instanceproperties',
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
