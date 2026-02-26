import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type { EventType, EventTypeAdd, EventTypeUpdate } from '@Schemas'

export default interface IEventsTypesService extends ICrudService<
    EventType,
    EventTypeAdd,
    EventTypeUpdate
> {}
