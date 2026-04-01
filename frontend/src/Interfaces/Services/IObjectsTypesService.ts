import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    ObjectType,
    ObjectTypeAdd,
    ObjectTypeUpdate,
    objectTypeSchema,
} from '@Schemas'

export default interface IObjectsTypesService extends ICrudService<
    ObjectType,
    ObjectTypeAdd,
    ObjectTypeUpdate,
    InferListQuery<typeof objectTypeSchema>
> {
    getAllTypes(): Promise<ObjectType[]>
    getRootTypes(): Promise<ObjectType[]>
    getTypesByParentId(parentId: number): Promise<ObjectType[]>
}
