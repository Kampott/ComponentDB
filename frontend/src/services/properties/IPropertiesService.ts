import type {Property, PropertyAdd} from "../../schemas/Property.ts";

export default interface IPropertiesService {
    getProperties(): Promise<Property[]>

    getPropertyById(id: number): Promise<Property>

    addProperty(object: PropertyAdd): Promise<PropertyAdd>

    deleteProperty(id: number): Promise<null>

    getPropertiesByObjectId(objectId: number): Promise<Property[]>
}
