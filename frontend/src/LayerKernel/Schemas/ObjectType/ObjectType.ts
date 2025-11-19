import {
    createHasIdMeta,
    ObjectTypeValidator,
    type SchemaMeta,
} from '@RestSchemas'

export interface ObjectType {
    id: number
    name: string
    parent_id: number | null
    root_id: number
}

export const objectTypeMeta: SchemaMeta<ObjectType> = {
    ...createHasIdMeta<ObjectType>(),
    name: {
        displayName: 'Название',
        description: 'Название типа объекта',
        validators: [ObjectTypeValidator.name],
        readonly: false,
        canBeSetExplicitly: true,
    },
    parent_id: {
        displayName: 'Родительский тип',
        description: 'ID родительского типа',
        validators: [],
        readonly: true,
        canBeSetExplicitly: true,
        defaultValue: (parentId: number | null) => parentId,
    },
    root_id: {
        displayName: 'Корневой тип',
        description: 'ID корневого типа',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
    },
}
