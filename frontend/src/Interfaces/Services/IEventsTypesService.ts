import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    EventType,
    EventTypeAdd,
    eventTypeSchema,
    EventTypeUpdate,
    InferListQuery,
} from '@Schemas'

export default interface IEventsTypesService extends ICrudService<
    EventType,
    EventTypeAdd,
    EventTypeUpdate,
    InferListQuery<typeof eventTypeSchema>
> {
    getEventTypesByTypeId(typeId: number): Promise<EventType[]>
}
