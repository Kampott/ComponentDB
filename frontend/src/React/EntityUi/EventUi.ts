import { createElement } from 'react'

import KeyValueObjectView from '@Components/Common/Forms/KeyValueObjectView.tsx'
import { eventSchema, eventTypeSchema, replacementEventSchema } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

import { defineEntityUiSchema } from '@EntityDsl/Ui'

export const eventUiSchema = defineEntityUiSchema<typeof eventSchema>()({
    entity: 'Event',
    fields: {
        id: {
            common: {
                label: 'ID',
                description: 'Уникальный идентификатор',
            },
            create: { visible: false },
            update: { visible: false },
            read: { visible: false },
            form: { input: 'number' },
        },
        event_type_id: {
            common: {
                label: 'Тип события',
                description: 'Идентификатор типа события',
            },
            create: {
                defaultValue: context => context.defaultTypeId ?? 1,
            },
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
                input: 'search-select',
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
                defaultValue: context => context.defaultTime ?? new Date(),
            },
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
                visible: true,
                defaultValue: () => ({}),
            },
            update: { visible: true },
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
                defaultValue: context => context.instanceId,
            },
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

export const eventTypeUiSchema = defineEntityUiSchema<typeof eventTypeSchema>()(
    {
        entity: 'EventType',
        fields: {
            id: {
                common: {
                    label: 'ID',
                    description: 'Уникальный идентификатор',
                },
                create: { visible: false },
                update: { visible: false },
                read: { visible: false },
                form: { input: 'number' },
            },
            name: {
                common: {
                    label: 'Название',
                    description: 'Название типа события',
                },
                form: { input: 'text' },
            },
        },
    },
)

export const replacementEventUiSchema = defineEntityUiSchema<
    typeof replacementEventSchema
>()({
    entity: 'ReplacementEvent',
    fields: {
        event_id: {
            common: {
                label: 'Событие',
                description: 'Идентификатор события',
            },
            create: {
                visible: false,
                defaultValue: context => context.eventId,
            },
            form: { input: 'number' },
        },
        new_instance_id: {
            common: {
                label: 'Новый экземпляр',
                description: 'Идентификатор нового экземпляра',
            },
            form: { input: 'number' },
        },
    },
})
