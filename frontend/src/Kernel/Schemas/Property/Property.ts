import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'

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
    fields: {
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        property_id: {
            common: {
                label: 'Свойство',
                description: 'Выберите свойство',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.propertyTypeId,
            },
            update: { policy: 'forbidden' },
            form: { input: 'number' },
        },
        value: {
            common: {
                label: 'Значение',
                description: 'Значение свойства',
            },
            create: { policy: 'required' },
            update: { policy: 'optional' },
            form: { input: 'text' },
        },
        object_id: {
            common: {
                label: 'Объект',
                description: 'Выберите объект',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.objectId,
            },
            update: { policy: 'forbidden' },
            form: { input: 'number' },
        },
    },
})

export type PropertyAdd = InferCreate<typeof propertySchema>
export type PropertyUpdate = InferUpdate<typeof propertySchema>
