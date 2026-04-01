import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    Event,
    EventAdd,
    eventSchema,
    EventUpdate,
    InferListQuery,
} from '@Schemas'

export default interface IEventsService extends ICrudService<
    Event,
    EventAdd,
    EventUpdate,
    InferListQuery<typeof eventSchema>
> {
    getEventsByInstanceId(instanceId: number): Promise<Event[]>
}
