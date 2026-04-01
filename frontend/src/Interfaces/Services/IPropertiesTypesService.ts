import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate,
    propertyTypeSchema,
} from '@Schemas'

export default interface IPropertiesTypesService extends ICrudService<
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate,
    InferListQuery<typeof propertyTypeSchema>
> {
    getPropertyTypesByTypeId(
        typeId: number,
        isStatic: boolean,
    ): Promise<PropertyType[]>
}
