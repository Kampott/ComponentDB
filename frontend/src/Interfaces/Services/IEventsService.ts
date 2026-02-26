import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type { Event, EventAdd, EventUpdate } from '@Schemas'

export default interface IEventsService extends ICrudService<
    Event,
    EventAdd,
    EventUpdate
> {
    getEventsByInstanceId(instanceId: number): Promise<Event[]>
}
