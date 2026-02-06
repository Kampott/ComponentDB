import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    ObjectInstance,
    ObjectInstanceAdd,
    ObjectInstanceUpdate,
} from '@Schemas'

export default interface IObjectsInstancesService extends ICrudService<
    ObjectInstance,
    ObjectInstanceAdd,
    ObjectInstanceUpdate
> {
    getInstancesByObjectId(objectId: number): Promise<ObjectInstance[]>

    getInstancesByParentId(parentId: number): Promise<ObjectInstance[]>
}
