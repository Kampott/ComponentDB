import type {
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate,
} from '@RestSchemas'

export default interface IPropertiesTypesService {
    getPropertyTypes(): Promise<PropertyType[]>

    getPropertyTypeById(id: number): Promise<PropertyType>

    addPropertyType(object: PropertyTypeAdd): Promise<PropertyTypeAdd>

    updatePropertyType(
        id: number,
        data: PropertyTypeUpdate,
    ): Promise<PropertyType>

    deletePropertyType(id: number): Promise<null>

    getPropertyTypesByTypeId(
        typeId: number,
        isStatic: boolean,
    ): Promise<PropertyType[]>
}
