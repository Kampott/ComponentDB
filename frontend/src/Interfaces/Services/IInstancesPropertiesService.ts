import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    InstanceProperty,
    InstancePropertyAdd,
    InstancePropertyUpdate,
    instancePropertySchema,
} from '@Schemas'

export default interface IInstancesPropertiesService extends ICrudService<
    InstanceProperty,
    InstancePropertyAdd,
    InstancePropertyUpdate,
    InferListQuery<typeof instancePropertySchema>
> {
    getInstancesPropertiesByInstanceId(
        objectId: number,
    ): Promise<InstanceProperty[]>
}
