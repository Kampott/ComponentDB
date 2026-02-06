import type IObjectsService from '@/Interfaces/Services/IObjectsService.ts'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type {
    ObjectAdd,
    Object as ObjectEntity,
    ObjectInstance,
    ObjectUpdate,
} from '@Schemas'

export default class MockObjectsService
    extends MockCrudService<ObjectEntity, ObjectAdd, ObjectUpdate>
    implements IObjectsService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.objects)
        this.store = store
    }

    public async create(data: ObjectAdd): Promise<ObjectEntity> {
        const id = this.store.nextId('objects')
        const parent = data.parent_id
            ? this.store.objects.find(item => item.id === data.parent_id)
            : null

        return this.pushEntity({
            id: id,
            name: data.name,
            type_id: data.type_id,
            parent_id: data.parent_id,
            root_id: parent ? parent.root_id : id,
        })
    }

    public async getObjectsByParentId(
        parentId: number,
    ): Promise<ObjectEntity[]> {
        return await this.list({ parent_id: parentId })
    }

    public async getObjectsByTypeId(typeId: number): Promise<ObjectEntity[]> {
        return await this.list({ type_id: typeId })
    }

    public async createInstance(rootObjectId: number): Promise<ObjectInstance> {
        const object = this.store.objects.find(item => item.id === rootObjectId)
        if (!object) {
            throw new Error(`Object with id=${rootObjectId} not found`)
        }

        const instance: ObjectInstance = {
            id: this.store.nextId('objectInstances'),
            name: `${object.name} instance`,
            object_id: object.id,
            parent_id: null,
            is_active: true,
            root_id: object.root_id,
        }

        this.store.objectInstances.push(instance)
        return instance
    }
}
