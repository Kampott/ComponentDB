import type IEventsService from '@/Interfaces/Services/IEventsService.ts'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type { Event, EventAdd, EventUpdate } from '@Schemas'

export default class MockEventsService
    extends MockCrudService<Event, EventAdd, EventUpdate>
    implements IEventsService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.events)
        this.store = store
    }

    public async create(data: EventAdd): Promise<Event> {
        return this.pushEntity({
            id: this.store.nextId('events'),
            type_id: data.type_id,
            time: data.time,
            info: data.info,
            instance_id: data.instance_id,
        })
    }

    public async getEventsByInstanceId(instanceId: number): Promise<Event[]> {
        return await this.list({ instance_id: instanceId })
    }
}
