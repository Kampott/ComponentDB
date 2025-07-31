import type {ObjectInstance, ObjectInstanceAdd} from "../../schemas/ObjectInstance.ts";

export default interface IObjectsInstancesService {
    getInstances(): Promise<ObjectInstance[]>

    getInstanceById(id: string): Promise<ObjectInstance>

    addInstance(object: ObjectInstanceAdd): Promise<ObjectInstanceAdd>

    deleteInstance(id: string): Promise<null>
}
