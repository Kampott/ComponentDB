import type IPropertiesService from '@/Interfaces/Services/IPropertiesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    propertySchema,
    type Property,
    type PropertyCreateContext,
} from '@Schemas'

export default class PropertiesService
    extends EntityCrudService<
        Property,
        PropertyCreateContext,
        typeof propertySchema.fields
    >
    implements IPropertiesService
{
    public constructor(client: RestApiClient) {
        super(client, propertySchema)
    }

    public async getPropertiesByObjectId(
        objectId: number,
    ): Promise<Property[]> {
        return await this.list({
            object_id: objectId,
        })
    }

    public async getPropertiesByInstanceId(
        instanceId: number,
    ): Promise<Property[]> {
        return await this.list({
            instance_id: instanceId,
        })
    }
}
