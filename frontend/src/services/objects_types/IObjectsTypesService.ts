import type {ObjectType, ObjectTypeAdd, ObjectTypeUpdate} from "../../schemas/ObjectType.ts";

export default interface IObjectsTypesService {
    getRootTypes(): Promise<ObjectType[]>

    getTypeById(id: number): Promise<ObjectType>

    addType(object: ObjectTypeAdd): Promise<ObjectTypeAdd>

    updateType(id: number, data: ObjectTypeUpdate): Promise<ObjectType>

    deleteType(id: number): Promise<null>

    getTypesByParentId(parentId: number): Promise<ObjectType[]>
}
