import type {Property, PropertyAdd} from "../../schemas/Property.ts";

export default interface IPropertiesService {
    getProperties(): Promise<Property[]>

    getPropertyById(id: string): Promise<Property>

    addProperty(object: PropertyAdd): Promise<PropertyAdd>

    deleteProperty(id: string): Promise<null>
}
