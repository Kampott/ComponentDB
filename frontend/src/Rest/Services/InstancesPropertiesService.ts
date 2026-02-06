import type IInstancesPropertiesService from '@/Interfaces/Services/IInstancesPropertiesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    instancePropertySchema,
    type InstanceProperty,
    type InstancePropertyCreateContext,
} from '@Schemas'

export default class InstancesPropertiesService
    extends EntityCrudService<
        InstanceProperty,
        InstancePropertyCreateContext,
        typeof instancePropertySchema.fields
    >
    implements IInstancesPropertiesService
{
    public constructor(client: RestApiClient) {
        super(client, instancePropertySchema)
    }

    public async getInstancesPropertiesByInstanceId(
        instanceId: number,
    ): Promise<InstanceProperty[]> {
        return await this.list({
            instance_id: instanceId,
        })
    }
}
