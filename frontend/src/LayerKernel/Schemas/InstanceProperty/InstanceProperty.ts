import { createHasIdMeta, type HasId, type SchemaMeta } from '@RestSchemas'

export interface InstanceProperty extends HasId {
    value: string
    instance_id: number
}

export const instancePropertyMeta: SchemaMeta<InstanceProperty> = {
    ...createHasIdMeta(),
    value: {
        displayName: 'Значение',
        description: 'Значение свойства экземпляра',
        validators: [],
        readonly: false,
        canBeSetExplicitly: true,
    },
    instance_id: {
        displayName: 'ID экземпляра',
        description: 'Идентификатор связанного экземпляра',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
        defaultValue: (propertyTypeId: number) => propertyTypeId,
    },
}
