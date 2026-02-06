import type IPropertiesTypesService from '@/Interfaces/Services/IPropertiesTypesService.ts'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type {
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate,
} from '@Schemas'

export default class MockPropertiesTypesService
    extends MockCrudService<PropertyType, PropertyTypeAdd, PropertyTypeUpdate>
    implements IPropertiesTypesService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.propertyTypes)
        this.store = store
    }

    public async create(data: PropertyTypeAdd): Promise<PropertyType> {
        return this.pushEntity({
            id: this.store.nextId('propertyTypes'),
            type_id: data.type_id,
            is_static: data.is_static,
            name: data.name,
        })
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
