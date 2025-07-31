import type RestApiClient from "../../http/RestApiClient.ts";
import type {PropertyType, PropertyTypeAdd} from "../../schemas/PropertyType.ts";
import type IPropertiesTypesService from "./IPropertiesTypesService.ts";

export default class PropertiesTypesService implements IPropertiesTypesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getTypes(): Promise<PropertyType[]> {
        return await this.client.get<PropertyType[]>("/property_types/")
    }
    public async getTypeById(id: string): Promise<PropertyType> {
        return await this.client.get<PropertyType>(`/property_types/${id}`);
    }
    public async addType(object: PropertyTypeAdd): Promise<PropertyTypeAdd> {
        return await this.client.post<PropertyTypeAdd, PropertyTypeAdd>("/property_types/", object);
    }
    public async deleteType(id: string): Promise<null> {
        return await this.client.delete(`/property_types/${id}`);
    }
}
