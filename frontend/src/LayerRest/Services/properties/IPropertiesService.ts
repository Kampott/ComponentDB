import type { Property, PropertyAdd, PropertyUpdate } from '@RestSchemas'

export default interface IPropertiesService {
    getProperties(): Promise<Property[]>

    getPropertyById(id: number): Promise<Property>

    addProperty(object: PropertyAdd): Promise<Property>

    updateProperty(id: number, data: PropertyUpdate): Promise<Property>

    deleteProperty(id: number): Promise<null>

    getPropertiesByObjectId(objectId: number): Promise<Property[]>

    getPropertiesByInstanceId(instanceId: number): Promise<Property[]>
}
