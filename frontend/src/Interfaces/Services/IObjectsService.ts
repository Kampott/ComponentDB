import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type { Object, ObjectAdd, ObjectInstance, ObjectUpdate } from '@Schemas'

export default interface IObjectsService extends ICrudService<
    Object,
    ObjectAdd,
    ObjectUpdate
> {
    getObjectsByParentId(parentId: number): Promise<Object[]>

    getObjectsByTypeId(typeId: number): Promise<Object[]>

    createInstance(rootObjectId: number): Promise<ObjectInstance>
}
