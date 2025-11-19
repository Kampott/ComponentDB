import type { ValidationResult } from '@RestSchemas'

export type FieldMetaOption<Field> = { label: string; value: Field }
export type OptionsArgFunc<Schema, Field extends keyof Schema> = (
    id: number,
) => Promise<FieldMetaOption<Schema[Field]>[]>
export type DefaultValueArgFunc<Schema, Field extends keyof Schema> = (
    value: Schema[Field],
) => Schema[Field] | Promise<Schema[Field]>

export type FieldMeta<Schema, Field extends keyof Schema> = {
    displayName: string
    description: string
    validators: ((value: Schema[Field]) => ValidationResult)[]
    readonly: boolean
    canBeSetExplicitly: boolean
    options?: OptionsArgFunc<Schema, Field>
    defaultValue?: DefaultValueArgFunc<Schema, Field>
}

export type SchemaMeta<Schema> = {
    [Field in keyof Schema]: FieldMeta<Schema, Field>
}

export type SchemaAdd<SchemaType> = {
    [K in keyof SchemaType as SchemaMeta<SchemaType>[K]['canBeSetExplicitly'] extends true
        ? K
        : SchemaMeta<SchemaType>[K]['defaultValue'] extends undefined
          ? never
          : K]: SchemaType[K]
}

export type SchemaMetaAdd<Schema, Meta extends SchemaMeta<Schema>> = {
    [K in keyof Meta as Meta[K]['canBeSetExplicitly'] extends true
        ? K
        : Meta[K]['defaultValue'] extends undefined
          ? never
          : K]: Meta[K]
}

export function filterSchemaMetaForAdd<Schema, Meta extends SchemaMeta<Schema>>(
    meta: Meta,
): SchemaMetaAdd<Schema, Meta> {
    const result: Partial<Record<keyof Meta, Meta[keyof Meta]>> = {}

    for (const key in meta) {
        const field = meta[key]
        const include =
            field.canBeSetExplicitly || field.defaultValue !== undefined

        if (include) {
            result[key as keyof Meta] = field
        }
    }

    return result as unknown as SchemaMetaAdd<Schema, Meta>
}

// export type UpdateDto<Schema, SchemaMetaImpl extends SchemaMeta<Schema>> = {
//     [FieldType in keyof Schema as SchemaMetaImpl[FieldType]['readonly'] extends true
//         ? never
//         : FieldType]?: Schema[FieldType]
// }
