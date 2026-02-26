import type IReplacementEventsService from '@/Interfaces/Services/IReplacementEventsService.ts'
import MockCrudService from '@/Mocks/Services/MockCrudService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type {
    ReplacementEvent,
    ReplacementEventAdd,
    ReplacementEventUpdate,
} from '@Schemas'

export default class MockReplacementEventsService
    extends MockCrudService<
        ReplacementEvent,
        ReplacementEventAdd,
        ReplacementEventUpdate
    >
    implements IReplacementEventsService
{
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        super(store.replacementEvents)
        this.store = store
    }

    public async create(data: ReplacementEventAdd): Promise<ReplacementEvent> {
        return this.pushEntity({
            id: this.store.nextId('replacementEvents'),
            event_id: data.event_id,
            new_instance_id: data.new_instance_id,
        })
    }

    public async getReplacementEventsByEventId(
        eventId: number,
    ): Promise<ReplacementEvent[]> {
        return await this.list({ event_id: eventId })
    }
}
