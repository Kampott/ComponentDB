import {
    createHasIdMeta,
    ObjectInstanceValidator,
    type SchemaMeta,
} from '@RestSchemas'

export interface ObjectInstance {
    id: number
    name: string
    object_id: number
    parent_id: number | null
    is_active: boolean
    root_id: number
}

export const objectInstanceMeta: SchemaMeta<ObjectInstance> = {
    ...createHasIdMeta<ObjectInstance>(),
    name: {
        displayName: 'Название',
        description: 'Название экземпляра объекта',
        validators: [ObjectInstanceValidator.name],
        readonly: false,
        canBeSetExplicitly: true,
    },
    object_id: {
        displayName: 'Объект',
        description: 'Объект экземпляра',
        validators: [],
        readonly: true,
        canBeSetExplicitly: true,
        defaultValue: (objectId: number) => objectId,
    },
    parent_id: {
        displayName: 'Родительский экземпляр',
        description: 'ID родительского экземпляра',
        validators: [],
        readonly: true,
        canBeSetExplicitly: true,
        defaultValue: (parentId: number | null) => parentId,
    },
    is_active: {
        displayName: 'Активен',
        description: 'Статус активности экземпляра',
        validators: [],
        readonly: false,
        canBeSetExplicitly: true,
    },
    root_id: {
        displayName: 'Корневой объект',
        description: 'ID корневого объекта',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
    },
}
