import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InstanceProperty,
    InstancePropertyAdd,
    InstancePropertyUpdate,
} from '@Schemas'

export default interface IInstancesPropertiesService extends ICrudService<
    InstanceProperty,
    InstancePropertyAdd,
    InstancePropertyUpdate
> {
    getInstancesPropertiesByInstanceId(
        objectId: number,
    ): Promise<InstanceProperty[]>
}
