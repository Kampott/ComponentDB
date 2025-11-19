import { createHasIdMeta, type SchemaMeta } from '@RestSchemas'

export interface Property {
    id: number
    property_id: number
    value: string
    object_id: number
}

export const propertyMeta: SchemaMeta<Property> = {
    ...createHasIdMeta<Property>(),
    property_id: {
        displayName: 'Свойство',
        description: 'Выберите свойство',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
        defaultValue: (propertyTypeId: number) => propertyTypeId,
    },
    value: {
        displayName: 'Значение',
        description: 'Значение свойства',
        validators: [],
        readonly: false,
        canBeSetExplicitly: true,
    },
    object_id: {
        displayName: 'Объект',
        description: 'Выберите объект',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
        defaultValue: (objectId: number) => objectId,
    },
}
