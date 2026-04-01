import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    Property,
    PropertyAdd,
    PropertyUpdate,
    propertySchema,
} from '@Schemas'

export default interface IPropertiesService extends ICrudService<
    Property,
    PropertyAdd,
    PropertyUpdate,
    InferListQuery<typeof propertySchema>
> {
    getPropertiesByObjectId(objectId: number): Promise<Property[]>

    getPropertiesByInstanceId(instanceId: number): Promise<Property[]>
}
