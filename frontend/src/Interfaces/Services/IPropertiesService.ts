import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type { Property, PropertyAdd, PropertyUpdate } from '@Schemas'

export default interface IPropertiesService extends ICrudService<
    Property,
    PropertyAdd,
    PropertyUpdate
> {
    getPropertiesByObjectId(objectId: number): Promise<Property[]>

    getPropertiesByInstanceId(instanceId: number): Promise<Property[]>
}
