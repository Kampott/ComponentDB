import type {ObjectType, ObjectTypeAdd} from "../../schemas/ObjectType.ts";

export default interface IObjectsTypesService {
    getRootTypes(): Promise<ObjectType[]>

    getTypeById(id: number): Promise<ObjectType>

    addType(object: ObjectTypeAdd): Promise<ObjectTypeAdd>

    deleteType(id: number): Promise<null>

    getTypesByParentId(parentId: number): Promise<ObjectType[]>
}
