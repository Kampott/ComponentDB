import type IPropertiesTypesService from '@/Interfaces/Services/IPropertiesTypesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    propertyTypeSchema,
    type PropertyType,
    type PropertyTypeCreateContext,
} from '@Schemas'

export default class PropertiesTypesService
    extends EntityCrudService<
        PropertyType,
        PropertyTypeCreateContext,
        typeof propertyTypeSchema.fields
    >
    implements IPropertiesTypesService
{
    public constructor(client: RestApiClient) {
        super(client, propertyTypeSchema)
    }

    public async getPropertyTypesByTypeId(
        typeId: number,
        isStatic: boolean,
    ): Promise<PropertyType[]> {
        return await this.list({
            type_id: typeId,
            is_static: `${isStatic}`,
        })
    }
}
