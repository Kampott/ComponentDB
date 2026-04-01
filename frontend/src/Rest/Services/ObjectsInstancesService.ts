import type IObjectsInstancesService from '@/Interfaces/Services/IObjectsInstancesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import { objectInstanceSchema, type ObjectInstance } from '@Schemas'

export default class ObjectsInstancesService
    extends EntityCrudService<typeof objectInstanceSchema>
    implements IObjectsInstancesService
{
    public constructor(client: RestApiClient) {
        super(client, objectInstanceSchema)
    }

    public async getInstancesByObjectId(
        objectId: number,
    ): Promise<ObjectInstance[]> {
        return await this.list({
            object_id: objectId,
        })
    }

    public async getInstancesByParentId(
        parentId: number,
    ): Promise<ObjectInstance[]> {
        return await this.list({
            parent_id: parentId,
        })
    }
}
