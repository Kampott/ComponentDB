import type IObjectsInstancesService from '@/Interfaces/Services/IObjectsInstancesService.ts'
import type {
    ObjectInstance,
    ObjectInstanceAdd,
    ObjectInstanceUpdate,
} from '@Schemas'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'

export default class MockObjectsInstancesService
    extends MockCrudService<
        ObjectInstance,
        ObjectInstanceAdd,
        ObjectInstanceUpdate
    >
    implements IObjectsInstancesService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.objectInstances)
        this.store = store
    }

    public async create(data: ObjectInstanceAdd): Promise<ObjectInstance> {
        const object = this.store.objects.find(
            item => item.id === data.object_id,
        )
        const parent = data.parent_id
            ? this.store.objectInstances.find(
                  item => item.id === data.parent_id,
              )
            : null

        return this.pushEntity({
            id: this.store.nextId('objectInstances'),
            name: data.name,
            object_id: data.object_id,
            parent_id: data.parent_id ?? null,
            is_active: data.is_active ?? true,
            root_id: parent
                ? parent.root_id
                : (object?.root_id ?? data.object_id),
        })
    }

    public async getInstancesByObjectId(
        objectId: number,
    ): Promise<ObjectInstance[]> {
        return await this.list({ object_id: objectId })
    }

    public async getInstancesByParentId(
        parentId: number,
    ): Promise<ObjectInstance[]> {
        return await this.list({ parent_id: parentId })
    }
}
