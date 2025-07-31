import type {InstanceProperty, InstancePropertyAdd} from "../../schemas/InstanceProperty.ts";

export default interface IInstancesPropertiesService {
    getInstances(): Promise<InstanceProperty[]>

    getInstanceById(id: string): Promise<InstanceProperty>

    addInstance(object: InstancePropertyAdd): Promise<InstancePropertyAdd>

    deleteInstance(id: string): Promise<null>
}
