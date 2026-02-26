import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    ReplacementEvent,
    ReplacementEventAdd,
    ReplacementEventUpdate,
} from '@Schemas'

export default interface IReplacementEventsService extends ICrudService<
    ReplacementEvent,
    ReplacementEventAdd,
    ReplacementEventUpdate
> {
    getReplacementEventsByEventId(eventId: number): Promise<ReplacementEvent[]>
}
