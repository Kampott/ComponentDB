import type RestApiClient from '@Rest/RestApiClient.ts'
import type { Property, PropertyAdd, PropertyUpdate } from '@RestSchemas'
import type IPropertiesService from './IPropertiesService.ts'

export default class PropertiesService implements IPropertiesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getProperties(): Promise<Property[]> {
        return await this.client.get<Property[]>('/properties/')
    }

    public async getPropertyById(id: number): Promise<Property> {
        return await this.client.get<Property>(`/properties/${id}`)
    }

    public async addProperty(object: PropertyAdd): Promise<Property> {
        return await this.client.post<PropertyAdd, Property>(
            '/properties/',
            object,
        )
    }

    public async updateProperty(
        id: number,
        data: PropertyUpdate,
    ): Promise<Property> {
        return await this.client.patch<PropertyUpdate, Property>(
            `/properties/${id}`,
            data,
        )
    }

    public async deleteProperty(id: number): Promise<null> {
        return await this.client.delete(`/properties/${id}`)
    }

    public async getPropertiesByObjectId(
        objectId: number,
    ): Promise<Property[]> {
        return await this.client.get<Property[]>('/properties/', {
            object_id: objectId,
        })
    }

    public async getPropertiesByInstanceId(
        instanceId: number,
    ): Promise<Property[]> {
        return await this.client.get<Property[]>('/properties/', {
            instance_id: instanceId,
        })
    }
}
