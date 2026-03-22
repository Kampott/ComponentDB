import LoadEffect from '@Components/Common/LoadEffect.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import EventsTable, {
    type EventTableRow,
} from '@Components/Pages/EventsPage/EventsTable.tsx'
import { Button } from '@Components/ui/button'
import { Input } from '@Components/ui/input'
import { eventUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    eventSchema,
    type Event,
    type EventAdd,
    type EventType,
    type EventUpdate,
} from '@Schemas'
import { useServicesStore } from '@StorageImpl'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
    instanceId?: number
    pageSize?: number
    showToolbar?: boolean
}

function normalizeEvent(event: Event): Event {
    if (event.timestamp instanceof Date) {
        return event
    }

    return {
        ...event,
        timestamp: new Date(String(event.timestamp)),
    }
}

function EventsSection({
    instanceId,
    pageSize = 10,
    showToolbar = true,
}: Props) {
    const navigate = useNavigate()
    const services = useServicesStore(state => state.services)

    const [events, setEvents] = useState<Event[] | null>(null)
    const [eventTypes, setEventTypes] = useState<EventType[] | null>(null)
    const [showAddEventForm, setShowAddEventForm] = useState(false)
    const [editTargetEvent, setEditTargetEvent] = useState<Event | null>(null)
    const [viewTargetEvent, setViewTargetEvent] = useState<Event | null>(null)
    const [search, setSearch] = useState('')

    const loadData = useCallback(async () => {
        setEvents(null)
        setEventTypes(null)

        try {
            const [eventsResponse, eventTypesResponse] = await Promise.all([
                instanceId === undefined
                    ? services.eventsService.list()
                    : services.eventsService.getEventsByInstanceId(instanceId),
                services.eventsTypesService.list(),
            ])

            setEvents(eventsResponse.map(normalizeEvent))
            setEventTypes(eventTypesResponse)
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [
        instanceId,
        navigate,
        services.eventsService,
        services.eventsTypesService,
    ])

    useEffect(() => {
        loadData()
    }, [loadData])

    const eventTypeNameById = useMemo(() => {
        const map = new Map<number, string>()
        for (const eventType of eventTypes ?? []) {
            map.set(eventType.id, eventType.name)
        }
        return map
    }, [eventTypes])

    const rows = useMemo<EventTableRow[]>(
        () =>
            (events ?? []).map(event => ({
                event: event,
                eventTypeName:
                    eventTypeNameById.get(event.event_type_id) ??
                    `Тип #${event.event_type_id}`,
            })),
        [events, eventTypeNameById],
    )

    async function handleCreateEvent(data: EventAdd | null): Promise<void> {
        setShowAddEventForm(false)
        if (!data) {
            return
        }

        try {
            await services.eventsService.create(data)
            await loadData()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleUpdateEvent(data: EventUpdate | null): Promise<void> {
        if (!editTargetEvent || !data) {
            setEditTargetEvent(null)
            return
        }

        try {
            await services.eventsService.update(editTargetEvent.id, data)
            setEditTargetEvent(null)
            await loadData()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleDeleteEvent(event: Event): Promise<void> {
        try {
            await services.eventsService.delete(event.id)
            await loadData()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    const defaultCreateContext = useMemo(
        () => ({
            instanceId: instanceId ?? 0,
            defaultTypeId: eventTypes?.[0]?.id ?? 1,
            defaultTime: new Date(),
        }),
        [instanceId, eventTypes],
    )

    return (
        <>
            {showToolbar && (
                <div className='mb-4 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3'>
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder='Фильтр поиска (будет реализован позже)'
                        className='max-w-md'
                        disabled
                    />
                    <Button
                        size='icon'
                        className='justify-self-end'
                        aria-label='Добавить событие'
                        onClick={() => setShowAddEventForm(true)}
                    >
                        +
                    </Button>
                </div>
            )}

            <LoadEffect
                data={events && eventTypes ? rows : null}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <EventsTable
                    rows={rows}
                    pageSize={pageSize}
                    onOpenInstance={id => navigate(`/instances/${id}`)}
                    onViewRequest={event => setViewTargetEvent(event)}
                    onAddRequest={() => setShowAddEventForm(true)}
                    onChangeRequest={event => setEditTargetEvent(event)}
                    onDeleteRequest={handleDeleteEvent}
                />
            </LoadEffect>

            {showAddEventForm && (
                <AddEntityForm
                    schema={eventSchema}
                    uiSchema={eventUiSchema}
                    context={defaultCreateContext}
                    defaults={{ info: {} }}
                    title='Добавление события'
                    submitCallback={handleCreateEvent}
                />
            )}
            {editTargetEvent && (
                <EditEntityForm
                    schema={eventSchema}
                    uiSchema={eventUiSchema}
                    context={{
                        instanceId: editTargetEvent.instance_id,
                        defaultTypeId: editTargetEvent.event_type_id,
                        defaultTime: editTargetEvent.timestamp,
                    }}
                    source={editTargetEvent}
                    title={`Изменение события #${editTargetEvent.id}`}
                    submitCallback={handleUpdateEvent}
                />
            )}
            {viewTargetEvent && (
                <ViewEntityModal
                    uiSchema={eventUiSchema}
                    context={{
                        instanceId: viewTargetEvent.instance_id,
                        defaultTypeId: viewTargetEvent.event_type_id,
                        defaultTime: viewTargetEvent.timestamp,
                    }}
                    source={viewTargetEvent}
                    title={`Событие #${viewTargetEvent.id}`}
                    onClose={() => setViewTargetEvent(null)}
                />
            )}
        </>
    )
}

export default EventsSection
