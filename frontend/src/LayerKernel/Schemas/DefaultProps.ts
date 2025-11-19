import type { FieldMeta, SchemaMeta } from '@RestSchemas'

export interface HasId {
    id: number
}

export const createHasIdMeta = <T extends { id: any }>(): Pick<
    SchemaMeta<T>,
    'id'
> => ({
    id: {
        displayName: 'ID',
        description: 'Уникальный идентификатор',
        validators: [],
        readonly: true,
        canBeSetExplicitly: false,
    } as FieldMeta<T, 'id'>,
})
