import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    AnyEntitySchema,
    InferCreate,
    InferEntity,
    InferListQuery,
    InferUpdate,
} from '@Schemas'

export default class EntityCrudService<
    SchemaDefinition extends AnyEntitySchema,
> implements ICrudService<
    InferEntity<SchemaDefinition>,
    InferCreate<SchemaDefinition>,
    InferUpdate<SchemaDefinition>,
    InferListQuery<SchemaDefinition>
> {
    protected readonly client: RestApiClient
    protected readonly schema: SchemaDefinition
    protected readonly basePath: string

    public constructor(client: RestApiClient, schema: SchemaDefinition) {
        this.client = client
        this.schema = schema
        this.basePath = `/${schema.resource}/`
    }

    public async list(
        query?: InferListQuery<SchemaDefinition>,
    ): Promise<InferEntity<SchemaDefinition>[]> {
        return await this.client.get<InferEntity<SchemaDefinition>[]>(
            this.basePath,
            query,
        )
    }

    public async read(id: number): Promise<InferEntity<SchemaDefinition>> {
        return await this.client.get<InferEntity<SchemaDefinition>>(
            `${this.basePath}${id}`,
        )
    }

    public async create(
        data: InferCreate<SchemaDefinition>,
    ): Promise<InferEntity<SchemaDefinition>> {
        return await this.client.post<
            InferCreate<SchemaDefinition>,
            InferEntity<SchemaDefinition>
        >(this.basePath, data)
    }

    public async update(
        id: number,
        data: InferUpdate<SchemaDefinition>,
    ): Promise<InferEntity<SchemaDefinition>> {
        return await this.client.patch<
            InferUpdate<SchemaDefinition>,
            InferEntity<SchemaDefinition>
        >(`${this.basePath}${id}`, data)
    }

    public async delete(id: number): Promise<null> {
        return await this.client.delete(`${this.basePath}${id}`)
    }
}
