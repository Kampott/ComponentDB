import type { HasId } from '@Kernel/Schemas/DefaultProps.ts'
import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'

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
    resource: 'instanceproperties',
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
        value: {
            common: {
                label: 'Значение',
                description: 'Значение свойства экземпляра',
            },
            create: { policy: 'required' },
            update: { policy: 'optional' },
            form: { input: 'text' },
        },
        instance_id: {
            common: {
                label: 'ID экземпляра',
                description: 'Идентификатор связанного экземпляра',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.instanceId,
            },
            update: { policy: 'forbidden' },
            form: { input: 'number' },
        },
    },
})

export type InstancePropertyAdd = InferCreate<typeof instancePropertySchema>
export type InstancePropertyUpdate = InferUpdate<typeof instancePropertySchema>
