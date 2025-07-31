import type {ObjectType, ObjectTypeAdd} from "../../schemas/ObjectType.ts";

export default interface IObjectsTypesService {
    getTypes(): Promise<ObjectType[]>

    getTypeById(id: string): Promise<ObjectType>

    addType(object: ObjectTypeAdd): Promise<ObjectTypeAdd>

    deleteType(id: string): Promise<null>
}
