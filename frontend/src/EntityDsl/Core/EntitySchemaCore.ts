/**
 * Core-правила формирования payload для create:
 * - required: ключ обязан присутствовать в InferCreate<...>
 * - optional: ключ опционален в InferCreate<...>
 * - forbidden: ключ исключается из InferCreate<...>
 */
export type EntityCreatePolicy = 'required' | 'optional' | 'forbidden'

/**
 * Core-правила формирования payload для update:
 * - optional: ключ может присутствовать в InferUpdate<...>
 * - forbidden: ключ исключается из InferUpdate<...>
 */
export type EntityUpdatePolicy = 'optional' | 'forbidden'

declare const entitySchemaPartsBrand: unique symbol

export type EntityCoreFieldCreate<Context> = {
    policy: EntityCreatePolicy
    // Context сохраняем в core-контракте как generic для совместимости.
    // Сам core не навязывает runtime-поведение, но legacy-слой может его расширять.
    context?: Context
}

export type EntityCoreFieldUpdate = {
    policy: EntityUpdatePolicy
}

export type EntityCoreField<Context> = {
    create: EntityCoreFieldCreate<Context>
    update: EntityCoreFieldUpdate
}

export type EntityCoreFields<Schema, Context> = {
    [Field in keyof Schema]: EntityCoreField<Context>
}

/**
 * Минимальная схема сущности, достаточная для DTO-типов и CRUD-сервисов.
 * UI/runtime-детали намеренно остаются вне этого слоя.
 */
export type EntityCoreSchema<
    Schema,
    Context,
    Fields extends EntityCoreFields<Schema, Context>,
> = {
    entity: string
    resource: string
    fields: Fields
    // Phantom-brand удерживает точные generic-параметры схемы
    // для последующего извлечения через InferCreate/InferUpdate.
    [entitySchemaPartsBrand]?: {
        schema: Schema
        context: Context
        fields: Fields
        resource: string
    }
}

export const defineEntityCoreSchema =
    <Schema, Context>() =>
    <const Fields extends EntityCoreFields<Schema, Context>>(
        schema: EntityCoreSchema<Schema, Context, Fields>,
    ) =>
        schema

type ExtractEntityParts<S> = S extends {
    [entitySchemaPartsBrand]?: infer Parts
}
    ? Parts extends {
          schema: infer Schema
          context: infer Context
          fields: infer Fields
          resource: string
      }
        ? {
              schema: Schema
              context: Context
              fields: Fields
              resource: string
          }
        : never
    : never

type EntityObject<S> = ExtractEntityParts<S>['schema'] extends object
    ? ExtractEntityParts<S>['schema']
    : never

export type InferEntity<S> = ExtractEntityParts<S>['schema']

export type EntityContext<S> = ExtractEntityParts<S>['context']
export type EntityResource<S> = ExtractEntityParts<S>['resource']
export type EntityFieldsOf<S> = ExtractEntityParts<S>['fields']

type FieldsOf<S> = EntityFieldsOf<S>
type FieldConfig<S, K extends keyof FieldsOf<S>> = Extract<
    FieldsOf<S>[K],
    {
        create: { policy: EntityCreatePolicy }
        update: { policy: EntityUpdatePolicy }
    }
>

type KeysByCreatePolicy<S, Policy extends EntityCreatePolicy> = {
    [Key in keyof FieldsOf<S>]: FieldConfig<S, Key> extends {
        create: { policy: Policy }
    }
        ? Key
        : never
}[keyof FieldsOf<S>] &
    keyof EntityObject<S>

type KeysByUpdatePolicy<S, Policy extends EntityUpdatePolicy> = {
    [Key in keyof FieldsOf<S>]: FieldConfig<S, Key> extends {
        update: { policy: Policy }
    }
        ? Key
        : never
}[keyof FieldsOf<S>] &
    keyof EntityObject<S>

type Flatten<T> = { [Key in keyof T]: T[Key] }
type RequiredCreateKeys<S> = KeysByCreatePolicy<S, 'required'>
type OptionalCreateKeys<S> = KeysByCreatePolicy<S, 'optional'>
type OptionalUpdateKeys<S> = KeysByUpdatePolicy<S, 'optional'>

export type CreateFieldKeys<S> = RequiredCreateKeys<S> | OptionalCreateKeys<S>
export type UpdateFieldKeys<S> = OptionalUpdateKeys<S>
export type ReadFieldKeys<S> = keyof EntityObject<S>

export type InferCreate<S> = Flatten<
    Pick<EntityObject<S>, RequiredCreateKeys<S>> &
        Partial<Pick<EntityObject<S>, OptionalCreateKeys<S>>>
>

export type InferUpdate<S> = Flatten<
    Partial<Pick<EntityObject<S>, OptionalUpdateKeys<S>>>
>

export function getCreateFieldKeys<
    Schema,
    Context,
    Fields extends EntityCoreFields<Schema, Context>,
>(
    schema: EntityCoreSchema<Schema, Context, Fields>,
): CreateFieldKeys<EntityCoreSchema<Schema, Context, Fields>>[] {
    type SchemaDefinition = EntityCoreSchema<Schema, Context, Fields>

    const fields = schema.fields
    const result: CreateFieldKeys<SchemaDefinition>[] = []

    for (const key of Object.keys(fields) as (keyof Fields)[]) {
        if (fields[key].create.policy !== 'forbidden') {
            result.push(key as CreateFieldKeys<SchemaDefinition>)
        }
    }

    return result
}

export function getUpdateFieldKeys<
    Schema,
    Context,
    Fields extends EntityCoreFields<Schema, Context>,
>(
    schema: EntityCoreSchema<Schema, Context, Fields>,
): UpdateFieldKeys<EntityCoreSchema<Schema, Context, Fields>>[] {
    type SchemaDefinition = EntityCoreSchema<Schema, Context, Fields>

    const fields = schema.fields
    const result: UpdateFieldKeys<SchemaDefinition>[] = []

    for (const key of Object.keys(fields) as (keyof Fields)[]) {
        if (fields[key].update.policy !== 'forbidden') {
            result.push(key as UpdateFieldKeys<SchemaDefinition>)
        }
    }

    return result
}
