import type IEventsTypesService from '@/Interfaces/Services/IEventsTypesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    eventTypeSchema,
    type EventType,
    type EventTypeCreateContext,
} from '@Schemas'

export default class EventsTypesService
    extends EntityCrudService<
        EventType,
        EventTypeCreateContext,
        typeof eventTypeSchema.fields
    >
    implements IEventsTypesService
{
    public constructor(client: RestApiClient) {
        super(client, eventTypeSchema)
    }

    public async getEventTypesByTypeId(typeId: number): Promise<EventType[]> {
        return await this.client.get<EventType[]>('/event_types/', {
            type_id: typeId,
        })
    }
}
