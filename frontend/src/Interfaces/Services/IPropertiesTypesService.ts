import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate,
} from '@Schemas'

export default interface IPropertiesTypesService extends ICrudService<
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate
> {
    getPropertyTypesByTypeId(
        typeId: number,
        isStatic: boolean,
    ): Promise<PropertyType[]>
}
