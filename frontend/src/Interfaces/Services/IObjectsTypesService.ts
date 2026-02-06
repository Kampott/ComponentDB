import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type { ObjectType, ObjectTypeAdd, ObjectTypeUpdate } from '@Schemas'

export default interface IObjectsTypesService extends ICrudService<
    ObjectType,
    ObjectTypeAdd,
    ObjectTypeUpdate
> {
    getTypesByParentId(parentId: number): Promise<ObjectType[]>
}
