import type {PropertyType, PropertyTypeAdd} from "../../schemas/PropertyType.ts";

export default interface IPropertiesTypesService {
    getPropertyTypes(): Promise<PropertyType[]>

    getPropertyTypeById(id: number): Promise<PropertyType>

    addPropertyType(object: PropertyTypeAdd): Promise<PropertyTypeAdd>

    deletePropertyType(id: number): Promise<null>

    getPropertyTypesByTypeId(typeId: number, isStatic: boolean): Promise<PropertyType[]>
}
