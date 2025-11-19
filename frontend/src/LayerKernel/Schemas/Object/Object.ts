import { createHasIdMeta, ObjectValidator, type SchemaMeta } from '@RestSchemas'
import { useServicesStore } from '@StorageImpl'

export interface Object {
    id: number
    name: string
    type_id: number
    parent_id: number | null
    root_id: number
}

export const objectMeta: SchemaMeta<Object> = {
    ...createHasIdMeta(),
    name: {
        displayName: 'Название',
        description: 'Название объекта',
        validators: [ObjectValidator.name],
        readonly: false,
        canBeSetExplicitly: true,
    },
    type_id: {
        displayName: 'Тип объекта',
        description: 'Тип объекта',
        validators: [],
        readonly: true,
        canBeSetExplicitly: true,
        options: async (parentTypeId: number) => {
            const types = await useServicesStore
                .getState()
                .services.objectsTypesService.getTypesByParentId(parentTypeId)
            return types.map(el => ({ label: el.name, value: el.id }))
        },
        defaultValue: async (parentTypeId: number) => {
            const types = await useServicesStore
                .getState()
                .services.objectsTypesService.getTypesByParentId(parentTypeId)
            return types.length > 0 ? types[0].id : -1
        },
    },
    parent_id: {
        displayName: 'Родительский объект',
        description: 'ID родительского объекта',
        validators: [],
        readonly: true,
        canBeSetExplicitly: true,
        defaultValue: (parentObjectId: number | null) => parentObjectId,
    },
    root_id: {
        displayName: 'Корневой объект',
        description: 'ID корневого объекта',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
    },
}
