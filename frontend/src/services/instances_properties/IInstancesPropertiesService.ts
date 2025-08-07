import type {InstanceProperty, InstancePropertyAdd} from "../../schemas/InstanceProperty.ts";

export default interface IInstancesPropertiesService {
    getInstances(): Promise<InstanceProperty[]>

    getInstanceById(id: number): Promise<InstanceProperty>

    addInstance(object: InstancePropertyAdd): Promise<InstancePropertyAdd>

    deleteInstance(id: number): Promise<null>

    getInstancesByObjectId(objectId: number): Promise<InstanceProperty[]>
}
