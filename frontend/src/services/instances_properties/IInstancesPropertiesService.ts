import type {InstanceProperty, InstancePropertyAdd} from "../../schemas/InstanceProperty.ts";

export default interface IInstancesPropertiesService {
    getInstancesProperties(): Promise<InstanceProperty[]>

    getInstancePropertyById(id: number): Promise<InstanceProperty>

    addInstanceProperty(object: InstancePropertyAdd): Promise<InstancePropertyAdd>

    deleteInstanceProperty(id: number): Promise<null>

    getInstancesPropertiesByInstanceId(objectId: number): Promise<InstanceProperty[]>
}
