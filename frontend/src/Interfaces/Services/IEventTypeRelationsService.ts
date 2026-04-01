import type { CrudQuery } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    EventType,
    EventTypeTypeLink,
    EventTypeTypeLinkAdd,
    ObjectType,
} from '@Schemas'

export type EventTypeRelationsQuery = Partial<
    Pick<EventTypeTypeLink, 'event_type_id' | 'type_id'>
> &
    Partial<{
        event_type_id__in: number[] | readonly number[]
        type_id__in: number[] | readonly number[]
    }> &
    CrudQuery

export default interface IEventTypeRelationsService {
    list(query?: EventTypeRelationsQuery): Promise<EventTypeTypeLink[]>
    read(eventTypeId: number, typeId: number): Promise<EventTypeTypeLink>
    create(data: EventTypeTypeLinkAdd): Promise<EventTypeTypeLink>
    delete(eventTypeId: number, typeId: number): Promise<null>
    getEventTypesByTypeId(typeId: number): Promise<EventType[]>
    getTypesByEventTypeId(eventTypeId: number): Promise<ObjectType[]>
}
