import type IReplacementEventsService from '@/Interfaces/Services/IReplacementEventsService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    replacementEventSchema,
    type ReplacementEvent,
    type ReplacementEventCreateContext,
} from '@Schemas'

export default class ReplacementEventsService
    extends EntityCrudService<
        ReplacementEvent,
        ReplacementEventCreateContext,
        typeof replacementEventSchema.fields
    >
    implements IReplacementEventsService
{
    public constructor(client: RestApiClient) {
        super(client, replacementEventSchema)
    }

    public async getReplacementEventsByEventId(
        eventId: number,
    ): Promise<ReplacementEvent[]> {
        return await this.list({
            event_id: eventId,
        })
    }
}
