import { createHasIdMeta, type SchemaMeta } from '@RestSchemas'

export interface PropertyType {
    id: number
    type_id: number
    is_static: boolean
    name: string
}

export const propertyTypeMeta: SchemaMeta<PropertyType> = {
    ...createHasIdMeta<PropertyType>(),
    type_id: {
        displayName: 'Тип объекта',
        description: 'Тип, к которому относится это свойство',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
        defaultValue: (objectTypeId: number) => objectTypeId,
    },
    is_static: {
        displayName: 'Статичное',
        description:
            'Если задано, то свойство относится к типу. Иначе - к экземпляру',
        validators: [],
        readonly: false,
        canBeSetExplicitly: true,
    },
    name: {
        displayName: 'Название',
        description: 'Название типа свойства',
        validators: [],
        readonly: false,
        canBeSetExplicitly: true,
    },
}
