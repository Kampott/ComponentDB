import type IEventsService from '@/Interfaces/Services/IEventsService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import { eventSchema, type Event, type EventCreateContext } from '@Schemas'

export default class EventsService
    extends EntityCrudService<
        Event,
        EventCreateContext,
        typeof eventSchema.fields
    >
    implements IEventsService
{
    public constructor(client: RestApiClient) {
        super(client, eventSchema)
    }

    public async getEventsByInstanceId(instanceId: number): Promise<Event[]> {
        return await this.list({
            instance_id: instanceId,
        })
    }
}
