import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    ObjectInstance,
    ObjectInstanceAdd,
    ObjectInstanceUpdate,
    objectInstanceSchema,
} from '@Schemas'

export default interface IObjectsInstancesService extends ICrudService<
    ObjectInstance,
    ObjectInstanceAdd,
    ObjectInstanceUpdate,
    InferListQuery<typeof objectInstanceSchema>
> {
    getInstancesByObjectId(objectId: number): Promise<ObjectInstance[]>

    getInstancesByParentId(parentId: number): Promise<ObjectInstance[]>
}
