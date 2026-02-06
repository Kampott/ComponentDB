import type { ValidationResult } from './Validator/Types.ts'

/**
 * Rules for create payload generation:
 * - required: key must be present in InferCreate<...>
 * - optional: key is optional in InferCreate<...>
 * - forbidden: key is excluded from InferCreate<...>
 */
export type EntityCreatePolicy = 'required' | 'optional' | 'forbidden'

/**
 * Rules for update payload generation:
 * - optional: key may be present in InferUpdate<...>
 * - forbidden: key is excluded from InferUpdate<...>
 */
export type EntityUpdatePolicy = 'optional' | 'forbidden'
export type EntityInputType =
    | 'text'
    | 'number'
    | 'boolean'
    | 'select'
    | 'password'

export type EntityFieldOption<Value> = {
    label: string
    value: Value
}

/**
 * Single field contract used by API typing and UI generation.
 * One declaration defines:
 * - how key participates in create/update DTOs
 * - how key is shown in form (input/visibility/options)
 * - how key is validated/defaulted
 */
export type EntityField<Schema, Field extends keyof Schema, Context> = {
    label: string
    description?: string
    input: EntityInputType
    create: EntityCreatePolicy
    update: EntityUpdatePolicy
    createVisible?: boolean
    updateVisible?: boolean
    validator?: (value: Schema[Field]) => ValidationResult
    options?: (
        context: Context,
    ) =>
        | EntityFieldOption<Schema[Field]>[]
        | Promise<EntityFieldOption<Schema[Field]>[]>
    defaultValue?: (context: Context) => Schema[Field] | Promise<Schema[Field]>
}

export type EntityFields<Schema, Context> = {
    [Field in keyof Schema]: EntityField<Schema, Field, Context>
}

/**
 * Root model for one entity.
 * Context is external runtime data required to resolve defaults/options
 * (example: parent id, route params, current user id).
 */
export type EntitySchema<
    Schema,
    Context,
    Fields extends EntityFields<Schema, Context>,
> = {
    entity: string
    fields: Fields
}

export const defineEntitySchema =
    <Schema, Context>() =>
    <const Fields extends EntityFields<Schema, Context>>(
        schema: EntitySchema<Schema, Context, Fields>,
    ) =>
        schema

type ExtractEntityParts<S> =
    S extends EntitySchema<infer Schema, infer Context, infer Fields>
        ? { schema: Schema; context: Context; fields: Fields }
        : never

type EntityObject<S> = ExtractEntityParts<S>['schema'] extends object
    ? ExtractEntityParts<S>['schema']
    : never

// Utility extraction helpers used by generic inference below.
export type InferEntity<S> = ExtractEntityParts<S>['schema']

export type EntityContext<S> = ExtractEntityParts<S>['context']

type FieldsOf<S> = ExtractEntityParts<S>['fields']
type FieldConfig<S, K extends keyof FieldsOf<S>> = Extract<
    FieldsOf<S>[K],
    { create: EntityCreatePolicy; update: EntityUpdatePolicy }
>

type KeysByCreatePolicy<S, Policy extends EntityCreatePolicy> = {
    [Key in keyof FieldsOf<S>]: FieldConfig<S, Key> extends { create: Policy }
        ? Key
        : never
}[keyof FieldsOf<S>] &
    keyof EntityObject<S>

type KeysByUpdatePolicy<S, Policy extends EntityUpdatePolicy> = {
    [Key in keyof FieldsOf<S>]: FieldConfig<S, Key> extends { update: Policy }
        ? Key
        : never
}[keyof FieldsOf<S>] &
    keyof EntityObject<S>

type Flatten<T> = { [Key in keyof T]: T[Key] }
type RequiredCreateKeys<S> = KeysByCreatePolicy<S, 'required'>
type OptionalCreateKeys<S> = KeysByCreatePolicy<S, 'optional'>
type OptionalUpdateKeys<S> = KeysByUpdatePolicy<S, 'optional'>

// Public keys to iterate create/update field sets at runtime.
export type CreateFieldKeys<S> = RequiredCreateKeys<S> | OptionalCreateKeys<S>

export type UpdateFieldKeys<S> = OptionalUpdateKeys<S>

export type InferCreate<S> = Flatten<
    Pick<EntityObject<S>, RequiredCreateKeys<S>> &
        Partial<Pick<EntityObject<S>, OptionalCreateKeys<S>>>
>

export type InferUpdate<S> = Flatten<
    Partial<Pick<EntityObject<S>, OptionalUpdateKeys<S>>>
>

/**
 * Runtime helper for form generation:
 * returns all keys that are allowed in create payload.
 * Order is preserved from schema declaration to keep form layout predictable.
 */
export function getCreateFieldKeys<
    Schema,
    Context,
    Fields extends EntityFields<Schema, Context>,
>(
    schema: EntitySchema<Schema, Context, Fields>,
): CreateFieldKeys<EntitySchema<Schema, Context, Fields>>[] {
    type SchemaDefinition = EntitySchema<Schema, Context, Fields>

    const fields = schema.fields
    const result: CreateFieldKeys<SchemaDefinition>[] = []

    for (const key of Object.keys(fields) as (keyof Fields)[]) {
        if (fields[key].create !== 'forbidden') {
            result.push(key as CreateFieldKeys<SchemaDefinition>)
        }
    }

    return result
}

/**
 * Runtime helper for update form generation:
 * returns all keys that are allowed in update payload.
 * Order is preserved from schema declaration.
 */
export function getUpdateFieldKeys<
    Schema,
    Context,
    Fields extends EntityFields<Schema, Context>,
>(
    schema: EntitySchema<Schema, Context, Fields>,
): UpdateFieldKeys<EntitySchema<Schema, Context, Fields>>[] {
    type SchemaDefinition = EntitySchema<Schema, Context, Fields>

    const fields = schema.fields
    const result: UpdateFieldKeys<SchemaDefinition>[] = []

    for (const key of Object.keys(fields) as (keyof Fields)[]) {
        if (fields[key].update !== 'forbidden') {
            result.push(key as UpdateFieldKeys<SchemaDefinition>)
        }
    }

    return result
}
