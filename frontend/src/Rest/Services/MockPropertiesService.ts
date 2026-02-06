import type IPropertiesService from '@/Interfaces/Services/IPropertiesService.ts'
import type { Property, PropertyAdd, PropertyUpdate } from '@Schemas'
import MockCrudService from './MockCrudService.ts'
import MockDataStore from './MockDataStore.ts'

export default class MockPropertiesService
    extends MockCrudService<Property, PropertyAdd, PropertyUpdate>
    implements IPropertiesService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.properties)
        this.store = store
    }

    public async create(data: PropertyAdd): Promise<Property> {
        return this.pushEntity({
            id: this.store.nextId('properties'),
            property_id: data.property_id,
            value: data.value,
            object_id: data.object_id,
        })
    }

    public async getPropertiesByObjectId(
        objectId: number,
    ): Promise<Property[]> {
        return await this.list({ object_id: objectId })
    }

    public async getPropertiesByInstanceId(
        instanceId: number,
    ): Promise<Property[]> {
        const instance = this.store.objectInstances.find(
            item => item.id === instanceId,
        )
        if (!instance) {
            return []
        }

        return await this.list({ object_id: instance.object_id })
    }
}
