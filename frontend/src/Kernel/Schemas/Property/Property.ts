import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface Property {
    id: number
    property_id: number
    value: string
    object_id: number
}

export interface PropertyCreateContext {
    propertyTypeId: number
    objectId: number
}

export const propertySchema = defineEntitySchema<
    Property,
    PropertyCreateContext
>()({
    entity: 'Property',
    resource: 'properties',
    query: {
        object_id: ['exact', 'in'],
        property_id: ['exact', 'in'],
        value: ['exact', 'like'],
        id: ['exact', 'in', 'sort'],
    },
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        property_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        value: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        object_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
    },
})

export type PropertyAdd = InferCreate<typeof propertySchema>
export type PropertyUpdate = InferUpdate<typeof propertySchema>
