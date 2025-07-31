import type {Object, ObjectAdd} from "../../schemas/Object.ts";

export default interface IObjectsService {
    getObjects(): Promise<Object[]>

    getObjectById(id: string): Promise<Object>

    addObject(object: ObjectAdd): Promise<ObjectAdd>

    deleteObject(id: string): Promise<null>
}
