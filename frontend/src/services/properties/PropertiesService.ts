import type RestApiClient from "../../http/RestApiClient.ts";
import type {Property, PropertyAdd} from "../../schemas/Property.ts";
import type IPropertiesService from "./IPropertiesService.ts";

export default class PropertiesService implements IPropertiesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getProperties(): Promise<Property[]> {
        return await this.client.get<Property[]>("/properties/")
    }

    public async getPropertyById(id: string): Promise<Property> {
        return await this.client.get<Property>(`/properties/${id}`);
    }

    public async addProperty(object: PropertyAdd): Promise<PropertyAdd> {
        return await this.client.post<PropertyAdd, PropertyAdd>("/properties/", object);
    }

    public async deleteProperty(id: string): Promise<null> {
        return await this.client.delete(`/properties/${id}`);
    }
}
