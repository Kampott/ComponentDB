import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@/LayerKernel/Schemas/EntityDsl.ts'

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
    fields: {
        id: {
            label: 'ID',
            description: 'Уникальный идентификатор',
            input: 'number',
            create: 'forbidden',
            update: 'forbidden',
            createVisible: false,
            updateVisible: false,
        },
        property_id: {
            label: 'Свойство',
            description: 'Выберите свойство',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            createVisible: false,
            defaultValue: context => context.propertyTypeId,
        },
        value: {
            label: 'Значение',
            description: 'Значение свойства',
            input: 'text',
            create: 'required',
            update: 'optional',
        },
        object_id: {
            label: 'Объект',
            description: 'Выберите объект',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            createVisible: false,
            defaultValue: context => context.objectId,
        },
    },
})

export type PropertyAdd = InferCreate<typeof propertySchema>
export type PropertyUpdate = InferUpdate<typeof propertySchema>
