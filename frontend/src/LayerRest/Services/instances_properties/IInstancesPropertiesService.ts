import type {
    InstanceProperty,
    InstancePropertyAdd,
    InstancePropertyUpdate,
} from '@RestSchemas'

export default interface IInstancesPropertiesService {
    getInstancesProperties(): Promise<InstanceProperty[]>

    getInstancePropertyById(id: number): Promise<InstanceProperty>

    addInstanceProperty(object: InstancePropertyAdd): Promise<InstanceProperty>

    updateInstanceProperty(
        id: number,
        data: InstancePropertyUpdate,
    ): Promise<InstanceProperty>

    deleteInstanceProperty(id: number): Promise<null>

    getInstancesPropertiesByInstanceId(
        objectId: number,
    ): Promise<InstanceProperty[]>
}
