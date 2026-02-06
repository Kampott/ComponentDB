import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'
import { PropertyTypeValidator } from './PropertyTypeValidator.ts'

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
        type_id: {
            label: 'Тип объекта',
            description: 'Тип, к которому относится это свойство',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            createVisible: false,
            defaultValue: context => context.objectTypeId,
        },
        is_static: {
            label: 'Привязано к',
            description:
                'Если задано, то свойство относится к типу. Иначе - к экземпляру',
            input: 'select',
            create: 'required',
            update: 'optional',
            options: () => [
                { label: 'Объекту', value: true },
                { label: 'Экземпляру', value: false },
            ],
            defaultValue: context => context.defaultIsStatic ?? true,
        },
        name: {
            label: 'Название',
            description: 'Название типа свойства',
            input: 'text',
            create: 'required',
            update: 'optional',
            validator: PropertyTypeValidator.name,
        },
    },
})

export type PropertyTypeAdd = InferCreate<typeof propertyTypeSchema>
export type PropertyTypeUpdate = InferUpdate<typeof propertyTypeSchema>
