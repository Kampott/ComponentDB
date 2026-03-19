import type IReplacementEventsService from '@/Interfaces/Services/IReplacementEventsService.ts'
import type { ReplacementEventQuery } from '@/Interfaces/Services/IReplacementEventsService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type { ReplacementEvent, ReplacementEventAdd } from '@Schemas'

export default class MockReplacementEventsService implements IReplacementEventsService {
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        this.store = store
    }

    public async list(
        query?: ReplacementEventQuery,
    ): Promise<ReplacementEvent[]> {
        if (!query) {
            return [...this.store.replacementEvents]
        }

        return this.store.replacementEvents.filter(entity => {
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
        eventId: number,
        newInstanceId: number,
    ): Promise<ReplacementEvent> {
        const entity = this.store.replacementEvents.find(
            item =>
                item.event_id === eventId &&
                item.new_instance_id === newInstanceId,
        )
        if (!entity) {
            throw new Error(
                `ReplacementEvent not found for event_id=${eventId} and new_instance_id=${newInstanceId}`,
            )
        }
        return entity
    }

    public async create(data: ReplacementEventAdd): Promise<ReplacementEvent> {
        const entity: ReplacementEvent = {
            event_id: data.event_id,
            new_instance_id: data.new_instance_id,
        }
        this.store.replacementEvents.push(entity)
        return entity
    }

    public async delete(eventId: number, newInstanceId: number): Promise<null> {
        const index = this.store.replacementEvents.findIndex(
            item =>
                item.event_id === eventId &&
                item.new_instance_id === newInstanceId,
        )
        if (index >= 0) {
            this.store.replacementEvents.splice(index, 1)
        }
        return null
    }

    public async undo(
        eventId: number,
        newInstanceId: number,
    ): Promise<{
        message: string
        event_id: number
        new_instance_id: number
    }> {
        await this.delete(eventId, newInstanceId)
        return {
            message: 'Replacement undone successfully',
            event_id: eventId,
            new_instance_id: newInstanceId,
        }
    }

    public async getReplacementEventsByEventId(
        eventId: number,
    ): Promise<ReplacementEvent[]> {
        return await this.list({ event_id: eventId })
    }
}
