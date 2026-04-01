import type {
    EntityContext,
    EntityCoreSchema,
    EntityFieldsOf,
    InferEntity,
} from '@EntityDsl/Core'
import type { ValidationResult } from '@Schemas'

export type EntityInputType =
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'search-select'
    | 'datetime'
    | 'password'
    | 'kv-object'

export type EntityFieldOption<Value> = {
    label: string
    value: Value
}

export type EntityFieldCommon = {
    label: string
    description?: string
}

export type EntityFieldCreateUi<Schema, Field extends keyof Schema, Context> = {
    visible?: boolean
    defaultValue?: (context: Context) => Schema[Field] | Promise<Schema[Field]>
}

export type EntityFieldUpdateUi<Schema, Field extends keyof Schema, Context> = {
    visible?: boolean
    defaultValue?: (context: Context) => Schema[Field] | Promise<Schema[Field]>
}

export type EntityFieldReadUi<Schema, Field extends keyof Schema, Context> = {
    visible?: boolean
    printValue?: (
        value: Schema[Field],
        context: Context,
    ) => import('react').ReactNode | Promise<import('react').ReactNode>
}

export type EntityFieldFormUi<Schema, Field extends keyof Schema, Context> = {
    input: EntityInputType
    validator?: (value: Schema[Field]) => ValidationResult
    parser?: (rawValue: unknown, context: Context) => Schema[Field]
    options?: (
        context: Context,
    ) =>
        | EntityFieldOption<Schema[Field]>[]
        | Promise<EntityFieldOption<Schema[Field]>[]>
}

export type EntityFieldUi<Schema, Field extends keyof Schema, Context> = {
    common: EntityFieldCommon
    create?: EntityFieldCreateUi<Schema, Field, Context>
    update?: EntityFieldUpdateUi<Schema, Field, Context>
    read?: EntityFieldReadUi<Schema, Field, Context>
    form: EntityFieldFormUi<Schema, Field, Context>
}

type EntityUiFieldKeys<S extends EntityCoreSchema<any, any, any>> =
    keyof EntityFieldsOf<S> & keyof InferEntity<S>

export type EntityUiFields<S extends EntityCoreSchema<any, any, any>> = {
    [Field in EntityUiFieldKeys<S>]: EntityFieldUi<
        InferEntity<S>,
        Field,
        EntityContext<S>
    >
}

export type EntityUiSchema<S extends EntityCoreSchema<any, any, any>> = {
    entity: string
    fields: EntityUiFields<S>
}

export const defineEntityUiSchema =
    <S extends EntityCoreSchema<any, any, any>>() =>
    <const Fields extends EntityUiFields<S>>(schema: {
        entity: string
        fields: Fields
    }) =>
        schema
