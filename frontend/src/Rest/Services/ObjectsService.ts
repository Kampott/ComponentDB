import type IObjectsService from '@/Interfaces/Services/IObjectsService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    objectSchema,
    type Object,
    type ObjectCreateContext,
    type ObjectInstance,
} from '@Schemas'

export default class ObjectsService
    extends EntityCrudService<
        Object,
        ObjectCreateContext,
        typeof objectSchema.fields
    >
    implements IObjectsService
{
    public constructor(client: RestApiClient) {
        super(client, objectSchema)
    }

    public async getObjectsByParentId(parentId: number): Promise<Object[]> {
        return await this.list({
            parent_id: parentId,
        })
    }

    public async getObjectsByTypeId(typeId: number): Promise<Object[]> {
        return await this.list({ type_id: typeId })
    }

    public async createInstance(rootObjectId: number): Promise<ObjectInstance> {
        return await this.client.post(`/objects/${rootObjectId}/instance`, {})
    }
}
