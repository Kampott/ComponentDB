import type IObjectsTypesService from '@/Interfaces/Services/IObjectsTypesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import { objectTypeSchema, type ObjectType } from '@Schemas'

export default class ObjectsTypesService
    extends EntityCrudService<typeof objectTypeSchema>
    implements IObjectsTypesService
{
    public constructor(client: RestApiClient) {
        super(client, objectTypeSchema)
    }

    public async getAllTypes(): Promise<ObjectType[]> {
        return await this.list()
    }

    public async getRootTypes(): Promise<ObjectType[]> {
        return await this.client.get<ObjectType[]>('/data-manip/root-types')
    }

    public async getTypesByParentId(parentId: number): Promise<ObjectType[]> {
        return await this.list({
            parent_id: parentId,
        })
    }
}
