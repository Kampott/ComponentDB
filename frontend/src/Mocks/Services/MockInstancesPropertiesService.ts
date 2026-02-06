import type IInstancesPropertiesService from '@/Interfaces/Services/IInstancesPropertiesService.ts'
import type {
    InstanceProperty,
    InstancePropertyAdd,
    InstancePropertyUpdate,
} from '@Schemas'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'

export default class MockInstancesPropertiesService
    extends MockCrudService<
        InstanceProperty,
        InstancePropertyAdd,
        InstancePropertyUpdate
    >
    implements IInstancesPropertiesService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.instanceProperties)
        this.store = store
    }

    public async create(data: InstancePropertyAdd): Promise<InstanceProperty> {
        return this.pushEntity({
            id: this.store.nextId('instanceProperties'),
            value: data.value,
            instance_id: data.instance_id,
        })
    }

    public async getInstancesPropertiesByInstanceId(
        objectId: number,
    ): Promise<InstanceProperty[]> {
        return await this.list({
            instance_id: objectId,
        })
    }
}
