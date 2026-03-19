import { createElement } from 'react'

import KeyValueObjectView from '@Components/Common/Forms/KeyValueObjectView.tsx'
import {
    defineEntitySchema,
    type InferCreate,
    type InferUpdate,
} from '@Kernel/Schemas/EntityDsl.ts'
import { useServicesStore } from '@StorageImpl'

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
    fields: {
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        event_type_id: {
            common: {
                label: 'Тип события',
                description: 'Идентификатор типа события',
            },
            create: {
                policy: 'required',
                defaultValue: context => context.defaultTypeId ?? 1,
            },
            update: { policy: 'optional' },
            read: {
                printValue: async value => {
                    try {
                        const eventType = await useServicesStore
                            .getState()
                            .services.eventsTypesService.read(value)
                        return eventType.name
                    } catch {
                        return String(value)
                    }
                },
            },
            form: {
                input: 'select',
                options: async () => {
                    const types = await useServicesStore
                        .getState()
                        .services.eventsTypesService.list()

                    return types.map(type => ({
                        label: type.name,
                        value: type.id,
                    }))
                },
            },
        },
        timestamp: {
            common: {
                label: 'Время события',
                description: 'Дата и время события',
            },
            create: {
                policy: 'required',
                defaultValue: context => context.defaultTime ?? new Date(),
            },
            update: { policy: 'optional' },
            read: {
                printValue: value => value.toLocaleString('ru-RU'),
            },
            form: { input: 'datetime' },
        },
        info: {
            common: {
                label: 'Поля события',
                description: 'Дополнительная информация о событии',
            },
            create: {
                policy: 'optional',
                visible: true,
                defaultValue: () => ({}),
            },
            update: { policy: 'optional', visible: true },
            read: {
                printValue: value =>
                    createElement(KeyValueObjectView, { value }),
            },
            form: {
                input: 'kv-object',
                validator: value => {
                    if (!value) {
                        return null
                    }

                    const invalidKey = Object.keys(value).find(
                        key => key.trim().length === 0,
                    )
                    if (invalidKey !== undefined) {
                        return 'Ключи словаря не должны быть пустыми'
                    }

                    return null
                },
            },
        },
        instance_id: {
            common: {
                label: 'Экземпляр',
                description: 'Идентификатор экземпляра',
            },
            create: {
                policy: 'required',
                defaultValue: context => context.instanceId,
            },
            update: { policy: 'forbidden' },
            read: {
                printValue: async value => {
                    try {
                        const instance = await useServicesStore
                            .getState()
                            .services.objectsInstancesService.read(value)
                        return `${instance.name} (#${value})`
                    } catch {
                        return String(value)
                    }
                },
            },
            form: { input: 'number' },
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
    fields: {
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { policy: 'forbidden', visible: false },
            update: { policy: 'forbidden', visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        name: {
            common: {
                label: 'Название',
                description: 'Название типа события',
            },
            create: { policy: 'required' },
            update: { policy: 'optional' },
            form: { input: 'text' },
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
    fields: {
        event_id: {
            common: {
                label: 'Событие',
                description: 'Идентификатор события',
            },
            create: {
                policy: 'required',
                visible: false,
                defaultValue: context => context.eventId,
            },
            update: { policy: 'forbidden' },
            form: { input: 'number' },
        },
        new_instance_id: {
            common: {
                label: 'Новый экземпляр',
                description: 'Идентификатор нового экземпляра',
            },
            create: { policy: 'required' },
            update: { policy: 'forbidden' },
            form: { input: 'number' },
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
