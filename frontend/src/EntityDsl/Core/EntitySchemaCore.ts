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

export type EntityQueryOperator =
    | 'exact'
    | 'like'
    | 'in'
    | 'gte'
    | 'lte'
    | 'gt'
    | 'lt'
    | 'sort'

export type EntityQuerySortDirection = 'asc' | 'desc'

export type EntityQueryScalar = string | number | boolean | Date
export type EntityQueryValue =
    | EntityQueryScalar
    | EntityQueryScalar[]
    | readonly EntityQueryScalar[]
export type EntityQueryParams = Record<string, EntityQueryValue | undefined>
export type EntityQueryConfig<QueryShape extends object> = {
    [Field in keyof QueryShape & string]?: readonly EntityQueryOperator[]
}

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
    Schema extends object,
    Context,
    Fields extends EntityCoreFields<Schema, Context>,
    QueryShape extends object = Schema,
> = {
    entity: string
    resource: string
    fields: Fields
    query: EntityQueryConfig<QueryShape>
    // Phantom-brand удерживает точные generic-параметры схемы
    // для последующего извлечения через InferCreate/InferUpdate.
    [entitySchemaPartsBrand]?: {
        schema: Schema
        context: Context
        fields: Fields
        queryShape: QueryShape
        query: EntityQueryConfig<QueryShape>
        resource: string
    }
}

export const defineEntityCoreSchema =
    <Schema extends object, Context, QueryShape extends object = Schema>() =>
    <const Fields extends EntityCoreFields<Schema, Context>>(
        schema: EntityCoreSchema<Schema, Context, Fields, QueryShape>,
    ) =>
        schema

type ExtractEntityParts<S> = S extends {
    [entitySchemaPartsBrand]?: infer Parts
}
    ? Parts extends {
          schema: infer Schema
          context: infer Context
          fields: infer Fields
          queryShape: infer QueryShape
          query: infer Query
          resource: string
      }
        ? {
              schema: Schema
              context: Context
              fields: Fields
              queryShape: QueryShape
              query: Query
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
export type AnyEntitySchema = EntityCoreSchema<any, any, any, any>

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

type EntityQueryObject<S> = ExtractEntityParts<S>['queryShape'] extends object
    ? ExtractEntityParts<S>['queryShape']
    : never

type QueryConfigOf<S> = ExtractEntityParts<S>['query']
type QueryConfigOps<
    Config,
    Field extends keyof Config,
> = Config[Field] extends readonly EntityQueryOperator[]
    ? Config[Field][number]
    : never
type QueryFieldsByOperator<S, Operator extends EntityQueryOperator> = {
    [Field in keyof QueryConfigOf<S>]: Operator extends QueryConfigOps<
        QueryConfigOf<S>,
        Field
    >
        ? Field
        : never
}[keyof QueryConfigOf<S>] &
    keyof EntityQueryObject<S> &
    string

type QueryScalarFor<Value> = Value extends Date ? Date | string : Value
type QueryListFor<Value> =
    | QueryScalarFor<Value>[]
    | readonly QueryScalarFor<Value>[]

type ExactQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<S, 'exact'>]: QueryScalarFor<
        EntityQueryObject<S>[Field]
    >
}>

type LikeQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<S, 'like'> as `${Field}__like`]: string
}>

type InQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<S, 'in'> as `${Field}__in`]: QueryListFor<
        EntityQueryObject<S>[Field]
    >
}>

type GteQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<
        S,
        'gte'
    > as `${Field}__gte`]: QueryScalarFor<EntityQueryObject<S>[Field]>
}>

type LteQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<
        S,
        'lte'
    > as `${Field}__lte`]: QueryScalarFor<EntityQueryObject<S>[Field]>
}>

type GtQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<S, 'gt'> as `${Field}__gt`]: QueryScalarFor<
        EntityQueryObject<S>[Field]
    >
}>

type LtQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<S, 'lt'> as `${Field}__lt`]: QueryScalarFor<
        EntityQueryObject<S>[Field]
    >
}>

type SortQueryFields<S> = Partial<{
    [Field in QueryFieldsByOperator<
        S,
        'sort'
    > as `${Field}__sort`]: EntityQuerySortDirection
}>

export type InferListQuery<S> = Flatten<
    EntityQueryParams &
        ExactQueryFields<S> &
        LikeQueryFields<S> &
        InQueryFields<S> &
        GteQueryFields<S> &
        LteQueryFields<S> &
        GtQueryFields<S> &
        LtQueryFields<S> &
        SortQueryFields<S>
>

export function getCreateFieldKeys<
    Schema extends object,
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
    Schema extends object,
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
