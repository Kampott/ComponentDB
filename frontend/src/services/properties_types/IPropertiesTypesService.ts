import type {PropertyType, PropertyTypeAdd} from "../../schemas/PropertyType.ts";

export default interface IPropertiesTypesService {
    getTypes(): Promise<PropertyType[]>

    getTypeById(id: string): Promise<PropertyType>

    addType(object: PropertyTypeAdd): Promise<PropertyTypeAdd>

    deleteType(id: string): Promise<null>
}
