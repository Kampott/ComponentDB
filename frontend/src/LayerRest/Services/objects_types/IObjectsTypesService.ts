import type { ObjectType, ObjectTypeAdd, ObjectTypeUpdate } from '@RestSchemas'

export default interface IObjectsTypesService {
    getRootTypes(): Promise<ObjectType[]>

    getTypeById(id: number): Promise<ObjectType>

    addType(object: ObjectTypeAdd): Promise<ObjectType>

    updateType(id: number, data: ObjectTypeUpdate): Promise<ObjectType>

    deleteType(id: number): Promise<null>

    getTypesByParentId(parentId: number): Promise<ObjectType[]>
}
