import type IEventsTypesService from '@/Interfaces/Services/IEventsTypesService.ts'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type { EventType, EventTypeAdd, EventTypeUpdate } from '@Schemas'

export default class MockEventsTypesService
    extends MockCrudService<EventType, EventTypeAdd, EventTypeUpdate>
    implements IEventsTypesService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.eventTypes)
        this.store = store
    }

    public async create(data: EventTypeAdd): Promise<EventType> {
        return this.pushEntity({
            id: this.store.nextId('eventTypes'),
            name: data.name,
        })
    }
}
