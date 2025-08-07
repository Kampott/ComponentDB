import type {ObjectInstance, ObjectInstanceAdd} from "../../schemas/ObjectInstance.ts";

export default interface IObjectsInstancesService {
    getInstances(): Promise<ObjectInstance[]>

    getInstanceById(id: number): Promise<ObjectInstance>

    addInstance(object: ObjectInstanceAdd): Promise<ObjectInstanceAdd>

    deleteInstance(id: number): Promise<null>

    getInstancesByObjectId(objectId: number): Promise<ObjectInstance[]>

    getInstancesByParentId(parentId: number): Promise<ObjectInstance[]>
}
