import type {Object, ObjectAdd} from "../../schemas/Object.ts";

export default interface IObjectsService {
    getObjects(): Promise<Object[]>

    getObjectById(id: number): Promise<Object>

    addObject(object: ObjectAdd): Promise<ObjectAdd>

    deleteObject(id: number): Promise<null>

    getObjectsByParentId(parentId: number): Promise<Object[]>

    getObjectsByTypeId(typeId: number): Promise<Object[]>
}
