import type { HasId } from '@/LayerKernel/Schemas/DefaultProps.ts'
import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@/LayerKernel/Schemas/EntityDsl.ts'

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
        value: {
            label: 'Значение',
            description: 'Значение свойства экземпляра',
            input: 'text',
            create: 'required',
            update: 'optional',
        },
        instance_id: {
            label: 'ID экземпляра',
            description: 'Идентификатор связанного экземпляра',
            input: 'number',
            create: 'required',
            update: 'forbidden',
            createVisible: false,
            defaultValue: context => context.instanceId,
        },
    },
})

export type InstancePropertyAdd = InferCreate<typeof instancePropertySchema>
export type InstancePropertyUpdate = InferUpdate<typeof instancePropertySchema>
