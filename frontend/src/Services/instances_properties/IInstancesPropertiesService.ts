import type {
    InstanceProperty,
    InstancePropertyAdd,
    InstancePropertyUpdate,
} from '@/Schemas/InstanceProperty.ts'

export default interface IInstancesPropertiesService {
    getInstancesProperties(): Promise<InstanceProperty[]>

    getInstancePropertyById(id: number): Promise<InstanceProperty>

    addInstanceProperty(
        object: InstancePropertyAdd,
    ): Promise<InstancePropertyAdd>

    updateInstanceProperty(
        id: number,
        data: InstancePropertyUpdate,
    ): Promise<InstanceProperty>

    deleteInstanceProperty(id: number): Promise<null>

    getInstancesPropertiesByInstanceId(
        objectId: number,
    ): Promise<InstanceProperty[]>
}
