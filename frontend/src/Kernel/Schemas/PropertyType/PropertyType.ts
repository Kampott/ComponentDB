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
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        type_id: {
            common: {
                label: 'Тип объекта',
                description: 'Тип, к которому относится это свойство',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.objectTypeId,
            },
            update: { policy: 'forbidden' },
            form: { input: 'number' },
        },
        is_static: {
            common: {
                label: 'Привязано к',
                description:
                    'Если задано, то свойство относится к типу. Иначе - к экземпляру',
            },
            create: {
                policy: 'required',
                defaultValue: context => context.defaultIsStatic ?? true,
            },
            update: { policy: 'optional' },
            read: {
                printValue: value => (value ? 'Объекту' : 'Экземпляру'),
            },
            form: {
                input: 'select',
                options: () => [
                    { label: 'Объекту', value: true },
                    { label: 'Экземпляру', value: false },
                ],
            },
        },
        name: {
            common: {
                label: 'Название',
                description: 'Название типа свойства',
            },
            create: { policy: 'required' },
            update: { policy: 'optional' },
            form: {
                input: 'text',
                validator: PropertyTypeValidator.name,
            },
        },
    },
})

export type PropertyTypeAdd = InferCreate<typeof propertyTypeSchema>
export type PropertyTypeUpdate = InferUpdate<typeof propertyTypeSchema>
