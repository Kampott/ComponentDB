import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'
import { ObjectInstanceValidator } from './ObjectInstanceValidator.ts'

export interface ObjectInstance {
    id: number
    name: string
    object_id: number
    parent_id: number | null
    is_active: boolean
    root_id: number
}

export interface ObjectInstanceCreateContext {
    objectId: number
    parentId?: number | null
    defaultIsActive?: boolean
}

export const objectInstanceSchema = defineEntitySchema<
    ObjectInstance,
    ObjectInstanceCreateContext
>()({
    entity: 'ObjectInstance',
    resource: 'instances',
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
            description: 'Название экземпляра объекта',
            input: 'text',
            create: 'required',
            update: 'optional',
            validator: ObjectInstanceValidator.name,
        },
        object_id: {
            label: 'Объект',
            description: 'Объект экземпляра',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            createVisible: false,
            defaultValue: context => context.objectId,
        },
        parent_id: {
            label: 'Родительский экземпляр',
            description: 'ID родительского экземпляра',
            input: 'number',
            create: 'optional',
            update: 'optional',
            createVisible: false,
            defaultValue: context => context.parentId ?? null,
        },
        is_active: {
            label: 'Активен',
            description: 'Статус активности экземпляра',
            input: 'boolean',
            create: 'optional',
            update: 'optional',
            defaultValue: context => context.defaultIsActive ?? true,
        },
        root_id: {
            label: 'Корневой объект',
            description: 'ID корневого объекта',
            input: 'number',
            create: 'forbidden',
            update: 'forbidden',
            createVisible: false,
            updateVisible: false,
        },
    },
})

export type ObjectInstanceAdd = InferCreate<typeof objectInstanceSchema>
export type ObjectInstanceUpdate = InferUpdate<typeof objectInstanceSchema>
