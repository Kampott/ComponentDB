import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'
import { useServicesStore } from '@StorageImpl'
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
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        name: {
            common: {
                label: 'Название',
                description: 'Название типа объекта',
            },
            create: { policy: 'required' },
            update: { policy: 'optional' },
            form: {
                input: 'text',
                validator: ObjectTypeValidator.name,
            },
        },
        parent_id: {
            common: {
                label: 'Родительский тип',
                description: 'ID родительского типа',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.parentTypeId,
            },
            update: { policy: 'forbidden' },
            read: {
                printValue: async (value): Promise<string> => {
                    if (value === null) {
                        return 'Корневой тип'
                    }

                    try {
                        const typeService = useServicesStore.getState()
                            .services as unknown as {
                            objectsTypesService: {
                                read: (id: number) => Promise<{ name: string }>
                            }
                        }
                        const parentType =
                            await typeService.objectsTypesService.read(value)
                        return parentType.name
                    } catch {
                        return String(value)
                    }
                },
            },
            form: { input: 'number' },
        },
        root_id: {
            common: {
                label: 'Корневой тип',
                description: 'ID корневого типа',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
    },
})

export type ObjectTypeAdd = InferCreate<typeof objectTypeSchema>
export type ObjectTypeUpdate = InferUpdate<typeof objectTypeSchema>
