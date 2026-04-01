import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@EntityDsl/Core'

// Схема события
export interface Event {
    id: number
    event_type_id: number
    timestamp: Date
    info: Record<string, unknown> | null
    instance_id: number
}

export interface EventCreateContext {
    instanceId: number
    defaultTypeId?: number
    defaultTime?: Date
}

export const eventSchema = defineEntitySchema<Event, EventCreateContext>()({
    entity: 'Event',
    resource: 'events',
    query: {
        event_type_id: ['exact', 'in'],
        instance_id: ['exact', 'in'],
        timestamp: ['exact', 'gte', 'lte', 'gt', 'lt', 'sort'],
        id: ['exact', 'in', 'gte', 'lte', 'sort'],
    },
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        event_type_id: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        timestamp: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
        info: {
            create: { policy: 'optional' },
            update: { policy: 'optional' },
        },
        instance_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
    },
})

// Схема типа события
export interface EventType {
    id: number
    name: string
}

export interface EventTypeTypeLink {
    event_type_id: number
    type_id: number
}

export type EventTypeCreateContext = Record<string, never>

export const eventTypeSchema = defineEntitySchema<
    EventType,
    EventTypeCreateContext
>()({
    entity: 'EventType',
    resource: 'event_types',
    query: {
        name: ['exact', 'like', 'sort'],
        id: ['exact', 'in', 'sort'],
    },
    fields: {
        id: {
            create: { policy: 'forbidden' },
            update: { policy: 'forbidden' },
        },
        name: {
            create: { policy: 'required' },
            update: { policy: 'optional' },
        },
    },
})

// Замена - таблица, связанная с событием и дающее доп информацию по ней (1-1 связь)
export interface ReplacementEvent {
    event_id: number
    new_instance_id: number
}

export interface ReplacementEventCreateContext {
    eventId: number
}

export const replacementEventSchema = defineEntitySchema<
    ReplacementEvent,
    ReplacementEventCreateContext
>()({
    entity: 'ReplacementEvent',
    resource: 'replacements',
    query: {
        event_id: ['exact', 'in'],
        new_instance_id: ['exact', 'in'],
    },
    fields: {
        event_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
        new_instance_id: {
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
        },
    },
})

export type EventAdd = InferCreate<typeof eventSchema>
export type EventUpdate = InferUpdate<typeof eventSchema>

export type EventTypeAdd = InferCreate<typeof eventTypeSchema>
export type EventTypeUpdate = InferUpdate<typeof eventTypeSchema>

export type EventTypeTypeLinkAdd = EventTypeTypeLink

export type ReplacementEventAdd = InferCreate<typeof replacementEventSchema>
export type ReplacementEventUpdate = InferUpdate<typeof replacementEventSchema>
