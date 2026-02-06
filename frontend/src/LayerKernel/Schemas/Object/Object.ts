import { useServicesStore } from '@StorageImpl'
import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '../EntityDsl.ts'
import { ObjectValidator } from './ObjectValidator.ts'

export interface Object {
    id: number
    name: string
    type_id: number
    parent_id: number | null
    root_id: number
}

export interface ObjectCreateContext {
    parentTypeId: number
    parentObjectId: number | null
}

/**
 * PoC entity schema:
 * one declaration drives:
 * - static DTO types (ObjectAdd/ObjectUpdate)
 * - runtime create form generation
 * - field-level rules (visibility/options/defaults/validation)
 */
export const objectSchema = defineEntitySchema<Object, ObjectCreateContext>()({
    entity: 'Object',
    fields: {
        // Server-managed technical field, never sent by client.
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
            description: 'Название объекта',
            input: 'text',
            create: 'required',
            update: 'optional',
            validator: ObjectValidator.name,
        },
        // Select is populated dynamically using external context.
        type_id: {
            label: 'Тип объекта',
            description: 'Тип объекта',
            input: 'select',
            create: 'required',
            update: 'forbidden',
            options: async context => {
                const types = await useServicesStore
                    .getState()
                    .services.objectsTypesService.getTypesByParentId(
                        context.parentTypeId,
                    )

                return types.map(type => ({
                    label: type.name,
                    value: type.id,
                }))
            },
        },
        parent_id: {
            label: 'Родительский объект',
            description: 'ID родительского объекта',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            // Hidden from UI, but automatically included in create payload.
            createVisible: false,
            defaultValue: context => context.parentObjectId,
        },
        // Computed by backend, not editable by client.
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

// Auto-generated DTO types from the schema policies above.
export type ObjectAdd = InferCreate<typeof objectSchema>
export type ObjectUpdate = InferUpdate<typeof objectSchema>
