import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    EntityFields,
    EntitySchema,
    InferCreate,
    InferEntity,
    InferUpdate,
} from '@Schemas'

type QueryParams = Record<string, number | string>

export default class EntityCrudService<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
> implements ICrudService<
    InferEntity<EntitySchema<Schema, Context, Fields>>,
    InferCreate<EntitySchema<Schema, Context, Fields>>,
    InferUpdate<EntitySchema<Schema, Context, Fields>>,
    QueryParams
> {
    protected readonly client: RestApiClient
    protected readonly schema: EntitySchema<Schema, Context, Fields>
    protected readonly basePath: string

    public constructor(
        client: RestApiClient,
        schema: EntitySchema<Schema, Context, Fields>,
    ) {
        this.client = client
        this.schema = schema
        this.basePath = `/${schema.resource}/`
    }

    public async list(
        query?: QueryParams,
    ): Promise<InferEntity<EntitySchema<Schema, Context, Fields>>[]> {
        return await this.client.get<
            InferEntity<EntitySchema<Schema, Context, Fields>>[]
        >(this.basePath, query)
    }

    public async read(
        id: number,
    ): Promise<InferEntity<EntitySchema<Schema, Context, Fields>>> {
        return await this.client.get<
            InferEntity<EntitySchema<Schema, Context, Fields>>
        >(`${this.basePath}${id}`)
    }

    public async create(
        data: InferCreate<EntitySchema<Schema, Context, Fields>>,
    ): Promise<InferEntity<EntitySchema<Schema, Context, Fields>>> {
        return await this.client.post<
            InferCreate<EntitySchema<Schema, Context, Fields>>,
            InferEntity<EntitySchema<Schema, Context, Fields>>
        >(this.basePath, data)
    }

    public async update(
        id: number,
        data: InferUpdate<EntitySchema<Schema, Context, Fields>>,
    ): Promise<InferEntity<EntitySchema<Schema, Context, Fields>>> {
        return await this.client.patch<
            InferUpdate<EntitySchema<Schema, Context, Fields>>,
            InferEntity<EntitySchema<Schema, Context, Fields>>
        >(`${this.basePath}${id}`, data)
    }

    public async delete(id: number): Promise<null> {
        return await this.client.delete(`${this.basePath}${id}`)
    }
}
