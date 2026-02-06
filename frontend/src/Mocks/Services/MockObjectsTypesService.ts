import type IObjectsTypesService from '@/Interfaces/Services/IObjectsTypesService.ts'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type { ObjectType, ObjectTypeAdd, ObjectTypeUpdate } from '@Schemas'

export default class MockObjectsTypesService
    extends MockCrudService<ObjectType, ObjectTypeAdd, ObjectTypeUpdate>
    implements IObjectsTypesService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.objectTypes)
        this.store = store
    }

    public async create(data: ObjectTypeAdd): Promise<ObjectType> {
        const id = this.store.nextId('objectTypes')
        const parent = data.parent_id
            ? this.store.objectTypes.find(item => item.id === data.parent_id)
            : null

        return this.pushEntity({
            id: id,
            name: data.name,
            parent_id: data.parent_id,
            root_id: parent ? parent.root_id : id,
        })
    }

    public async getTypesByParentId(parentId: number): Promise<ObjectType[]> {
        return await this.list({ parent_id: parentId })
    }
}
