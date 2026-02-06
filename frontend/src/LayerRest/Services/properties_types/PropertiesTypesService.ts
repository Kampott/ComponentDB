import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate,
} from '@RestSchemas'
import type IPropertiesTypesService from './IPropertiesTypesService.ts'

export default class PropertiesTypesService implements IPropertiesTypesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getPropertyTypes(): Promise<PropertyType[]> {
        return await this.client.get<PropertyType[]>('/property_types/')
    }

    public async getPropertyTypeById(id: number): Promise<PropertyType> {
        return await this.client.get<PropertyType>(`/property_types/${id}`)
    }

    public async addPropertyType(
        object: PropertyTypeAdd,
    ): Promise<PropertyType> {
        return await this.client.post<PropertyTypeAdd, PropertyType>(
            '/property_types/',
            object,
        )
    }

    public async updatePropertyType(
        id: number,
        data: PropertyTypeUpdate,
    ): Promise<PropertyType> {
        return await this.client.patch<PropertyTypeUpdate, PropertyType>(
            `/property_types/${id}`,
            data,
        )
    }

    public async deletePropertyType(id: number): Promise<null> {
        return await this.client.delete(`/property_types/${id}`)
    }

    public async getPropertyTypesByTypeId(
        typeId: number,
        isStatic: boolean,
    ): Promise<PropertyType[]> {
        return await this.client.get<PropertyType[]>('/property_types/', {
            type_id: typeId,
            is_static: `${isStatic}`,
        })
    }
}
