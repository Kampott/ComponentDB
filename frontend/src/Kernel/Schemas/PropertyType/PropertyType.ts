import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

export interface PropertyType {
    id: number
    type_id: number
    is_static: boolean
    name: string
}

export interface PropertyTypeCreateContext {
    objectTypeId: number
    defaultIsStatic?: boolean
}

export const propertyTypeSchema = defineEntitySchema<
    PropertyType,
    PropertyTypeCreateContext
>()({
    entity: 'PropertyType',
    resource: 'property_types',
    query: {
        type_id: ['exact', 'in'],
        name: ['exact', 'like', 'sort'],
        is_static: ['exact'],
        id: ['exact', 'in', 'sort'],
    },
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        type_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        is_static: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        name: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
    },
})

export type PropertyTypeAdd = InferCreate<typeof propertyTypeSchema>
export type PropertyTypeUpdate = InferUpdate<typeof propertyTypeSchema>
