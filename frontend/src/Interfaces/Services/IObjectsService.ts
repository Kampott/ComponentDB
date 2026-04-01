import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    Object,
    ObjectAdd,
    ObjectInstance,
    ObjectUpdate,
    objectSchema,
} from '@Schemas'

export default interface IObjectsService extends ICrudService<
    Object,
    ObjectAdd,
    ObjectUpdate,
    InferListQuery<typeof objectSchema>
> {
    getObjectsByParentId(parentId: number): Promise<Object[]>

    getObjectsByTypeId(typeId: number): Promise<Object[]>

    createInstance(rootObjectId: number): Promise<ObjectInstance>
}
