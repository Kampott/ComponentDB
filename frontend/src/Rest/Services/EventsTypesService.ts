import type IEventsTypesService from '@/Interfaces/Services/IEventsTypesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    eventTypeSchema,
    type EventType,
    type EventTypeTypeLink,
} from '@Schemas'

export default class EventsTypesService
    extends EntityCrudService<typeof eventTypeSchema>
    implements IEventsTypesService
{
    public constructor(client: RestApiClient) {
        super(client, eventTypeSchema)
    }

    public async getEventTypesByTypeId(typeId: number): Promise<EventType[]> {
        const relations = await this.client.get<EventTypeTypeLink[]>(
            '/event_types_types/',
            {
                type_id: typeId,
            },
        )

        const eventTypeIds = relations.map(relation => relation.event_type_id)
        if (eventTypeIds.length === 0) {
            return []
        }

        return await this.list({
            id__in: eventTypeIds,
        })
    }
}
