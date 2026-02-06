import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'
import { ObjectTypeValidator } from './ObjectTypeValidator.ts'

export interface ObjectType {
    id: number
    name: string
    parent_id: number | null
    root_id: number
}

export interface ObjectTypeCreateContext {
    parentTypeId: number | null
}

export const objectTypeSchema = defineEntitySchema<
    ObjectType,
    ObjectTypeCreateContext
>()({
    entity: 'ObjectType',
    resource: 'types',
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
        name: {
            label: 'Название',
            description: 'Название типа объекта',
            input: 'text',
            create: 'required',
            update: 'optional',
            validator: ObjectTypeValidator.name,
        },
        parent_id: {
            label: 'Родительский тип',
            description: 'ID родительского типа',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            createVisible: false,
            defaultValue: context => context.parentTypeId,
        },
        root_id: {
            label: 'Корневой тип',
            description: 'ID корневого типа',
            input: 'number',
            create: 'forbidden',
            update: 'forbidden',
            createVisible: false,
            updateVisible: false,
        },
    },
})

export type ObjectTypeAdd = InferCreate<typeof objectTypeSchema>
export type ObjectTypeUpdate = InferUpdate<typeof objectTypeSchema>
