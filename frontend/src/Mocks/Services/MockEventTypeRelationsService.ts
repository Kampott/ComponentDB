import type IEventTypeRelationsService from '@/Interfaces/Services/IEventTypeRelationsService.ts'
import type { EventTypeRelationsQuery } from '@/Interfaces/Services/IEventTypeRelationsService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type {
    EventType,
    EventTypeTypeLink,
    EventTypeTypeLinkAdd,
    ObjectType,
} from '@Schemas'

export default class MockEventTypeRelationsService implements IEventTypeRelationsService {
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        this.store = store
    }

    public async list(
        query?: EventTypeRelationsQuery,
    ): Promise<EventTypeTypeLink[]> {
        if (!query) {
            return [...this.store.eventTypeRelations]
        }

        return this.store.eventTypeRelations.filter(entity => {
            const indexedEntity = entity as unknown as Record<string, unknown>
            for (const [key, value] of Object.entries(query)) {
                if (String(indexedEntity[key]) !== String(value)) {
                    return false
                }
            }
            return true
        })
    }

    public async read(
        eventTypeId: number,
        typeId: number,
    ): Promise<EventTypeTypeLink> {
        const link = this.store.eventTypeRelations.find(
            item =>
                item.event_type_id === eventTypeId && item.type_id === typeId,
        )
        if (!link) {
            throw new Error(
                `EventTypeTypeLink not found for event_type_id=${eventTypeId} and type_id=${typeId}`,
            )
        }
        return link
    }

    public async create(
        data: EventTypeTypeLinkAdd,
    ): Promise<EventTypeTypeLink> {
        const link: EventTypeTypeLink = {
            event_type_id: data.event_type_id,
            type_id: data.type_id,
        }
        this.store.eventTypeRelations.push(link)
        return link
    }

    public async delete(eventTypeId: number, typeId: number): Promise<null> {
        const index = this.store.eventTypeRelations.findIndex(
            item =>
                item.event_type_id === eventTypeId && item.type_id === typeId,
        )
        if (index >= 0) {
            this.store.eventTypeRelations.splice(index, 1)
        }
        return null
    }

    public async getEventTypesByTypeId(typeId: number): Promise<EventType[]> {
        const eventTypeIds = new Set(
            this.store.eventTypeRelations
                .filter(link => link.type_id === typeId)
                .map(link => link.event_type_id),
        )

        return this.store.eventTypes.filter(eventType =>
            eventTypeIds.has(eventType.id),
        )
    }

    public async getTypesByEventTypeId(
        eventTypeId: number,
    ): Promise<ObjectType[]> {
        const typeIds = new Set(
            this.store.eventTypeRelations
                .filter(link => link.event_type_id === eventTypeId)
                .map(link => link.type_id),
        )

        return this.store.objectTypes.filter(type => typeIds.has(type.id))
    }
}
