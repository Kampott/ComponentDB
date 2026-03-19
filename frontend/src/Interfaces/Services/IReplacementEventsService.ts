import type { ReplacementEvent, ReplacementEventAdd } from '@Schemas'

export type ReplacementEventQuery = Partial<{
    event_id: number
    new_instance_id: number
}>

export default interface IReplacementEventsService {
    list(query?: ReplacementEventQuery): Promise<ReplacementEvent[]>
    read(eventId: number, newInstanceId: number): Promise<ReplacementEvent>
    create(data: ReplacementEventAdd): Promise<ReplacementEvent>
    delete(eventId: number, newInstanceId: number): Promise<null>
    undo(
        eventId: number,
        newInstanceId: number,
    ): Promise<{
        message: string
        event_id: number
        new_instance_id: number
    }>
    getReplacementEventsByEventId(eventId: number): Promise<ReplacementEvent[]>
}
