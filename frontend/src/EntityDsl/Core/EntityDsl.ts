import type {
    EntityCoreField,
    EntityCoreFieldCreate,
    EntityCoreFields,
    EntityCoreFieldUpdate,
    EntityCoreSchema,
} from './EntitySchemaCore.ts'
import { defineEntityCoreSchema } from './EntitySchemaCore.ts'

/**
 * Legacy entry point для schema-объявлений.
 *
 * Файл сохраняет привычный import path `@Kernel/Schemas/EntityDsl.ts`, но
 * реальный core-контракт теперь живёт в `EntitySchemaCore.ts`.
 *
 * Важный инвариант:
 * здесь больше нет UI/read/form-метаданных. Этот слой описывает только
 * data-contract и переэкспортирует core helper-ы для совместимости.
 */

export type EntityCreatePolicy =
    import('./EntitySchemaCore.ts').EntityCreatePolicy
export type EntityUpdatePolicy =
    import('./EntitySchemaCore.ts').EntityUpdatePolicy
export type EntityQueryOperator =
    import('./EntitySchemaCore.ts').EntityQueryOperator
export type EntityQuerySortDirection =
    import('./EntitySchemaCore.ts').EntityQuerySortDirection
export type EntityQueryScalar =
    import('./EntitySchemaCore.ts').EntityQueryScalar
export type EntityQueryValue = import('./EntitySchemaCore.ts').EntityQueryValue
export type EntityQueryParams =
    import('./EntitySchemaCore.ts').EntityQueryParams
export type EntityQueryConfig<QueryShape extends object> =
    import('./EntitySchemaCore.ts').EntityQueryConfig<QueryShape>

export type EntityFieldCreate<Context> = EntityCoreFieldCreate<Context>
export type EntityFieldUpdate = EntityCoreFieldUpdate
export type EntityField<Context> = EntityCoreField<Context>
export type EntityFields<Schema, Context> = EntityCoreFields<Schema, Context>

export type EntitySchema<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
    QueryShape extends object = Schema,
> = EntityCoreSchema<Schema, Context, Fields, QueryShape>

export const defineEntitySchema = defineEntityCoreSchema

export type InferEntity<S> = import('./EntitySchemaCore.ts').InferEntity<S>
export type EntityContext<S> = import('./EntitySchemaCore.ts').EntityContext<S>
export type EntityResource<S> =
    import('./EntitySchemaCore.ts').EntityResource<S>
export type EntityFieldsOf<S> =
    import('./EntitySchemaCore.ts').EntityFieldsOf<S>
export type AnyEntitySchema = import('./EntitySchemaCore.ts').AnyEntitySchema

export type CreateFieldKeys<S> =
    import('./EntitySchemaCore.ts').CreateFieldKeys<S>
export type UpdateFieldKeys<S> =
    import('./EntitySchemaCore.ts').UpdateFieldKeys<S>
export type ReadFieldKeys<S> = import('./EntitySchemaCore.ts').ReadFieldKeys<S>

export type InferCreate<S> = import('./EntitySchemaCore.ts').InferCreate<S>
export type InferUpdate<S> = import('./EntitySchemaCore.ts').InferUpdate<S>
export type InferListQuery<S> =
    import('./EntitySchemaCore.ts').InferListQuery<S>

export { getCreateFieldKeys, getUpdateFieldKeys } from './EntitySchemaCore.ts'
