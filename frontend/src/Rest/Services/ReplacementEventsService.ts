import type IReplacementEventsService from '@/Interfaces/Services/IReplacementEventsService.ts'
import type { ReplacementEventQuery } from '@/Interfaces/Services/IReplacementEventsService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import type { ReplacementEvent, ReplacementEventAdd } from '@Schemas'

export default class ReplacementEventsService implements IReplacementEventsService {
    private readonly client: RestApiClient
    private readonly basePath = '/replacements/'

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async list(
        query?: ReplacementEventQuery,
    ): Promise<ReplacementEvent[]> {
        return await this.client.get<ReplacementEvent[]>(this.basePath, query)
    }

    public async read(
        eventId: number,
        newInstanceId: number,
    ): Promise<ReplacementEvent> {
        return await this.client.get<ReplacementEvent>(
            `${this.basePath}${eventId}/${newInstanceId}`,
        )
    }

    public async create(data: ReplacementEventAdd): Promise<ReplacementEvent> {
        return await this.client.post<ReplacementEventAdd, ReplacementEvent>(
            this.basePath,
            data,
        )
    }

    public async delete(eventId: number, newInstanceId: number): Promise<null> {
        return await this.client.delete(
            `${this.basePath}${eventId}/${newInstanceId}`,
        )
    }

    public async undo(
        eventId: number,
        newInstanceId: number,
    ): Promise<{
        message: string
        event_id: number
        new_instance_id: number
    }> {
        return await this.client.post<
            Record<string, never>,
            {
                message: string
                event_id: number
                new_instance_id: number
            }
        >(`${this.basePath}${eventId}/${newInstanceId}/undo`, {})
    }

    public async getReplacementEventsByEventId(
        eventId: number,
    ): Promise<ReplacementEvent[]> {
        return await this.list({
            event_id: eventId,
        })
    }
}
