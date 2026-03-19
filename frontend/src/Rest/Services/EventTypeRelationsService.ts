import type IEventTypeRelationsService from '@/Interfaces/Services/IEventTypeRelationsService.ts'
import type { EventTypeRelationsQuery } from '@/Interfaces/Services/IEventTypeRelationsService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    EventType,
    EventTypeTypeLink,
    EventTypeTypeLinkAdd,
    ObjectType,
} from '@Schemas'

export default class EventTypeRelationsService implements IEventTypeRelationsService {
    private readonly client: RestApiClient
    private readonly basePath = '/event_types_types/'

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async list(
        query?: EventTypeRelationsQuery,
    ): Promise<EventTypeTypeLink[]> {
        return await this.client.get<EventTypeTypeLink[]>(this.basePath, query)
    }

    public async read(
        eventTypeId: number,
        typeId: number,
    ): Promise<EventTypeTypeLink> {
        return await this.client.get<EventTypeTypeLink>(
            `${this.basePath}${eventTypeId}/${typeId}`,
        )
    }

    public async create(
        data: EventTypeTypeLinkAdd,
    ): Promise<EventTypeTypeLink> {
        return await this.client.post<EventTypeTypeLinkAdd, EventTypeTypeLink>(
            this.basePath,
            data,
        )
    }

    public async delete(eventTypeId: number, typeId: number): Promise<null> {
        return await this.client.delete(
            `${this.basePath}${eventTypeId}/${typeId}`,
        )
    }

    public async getEventTypesByTypeId(typeId: number): Promise<EventType[]> {
        return await this.client.get<EventType[]>('/event_types/', {
            type_id: typeId,
        })
    }

    public async getTypesByEventTypeId(
        eventTypeId: number,
    ): Promise<ObjectType[]> {
        return await this.client.get<ObjectType[]>('/types/', {
            event_type_id: eventTypeId,
        })
    }
}
