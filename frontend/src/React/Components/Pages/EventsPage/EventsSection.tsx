import { useDataTableState } from '@/lib/useDataTableState.ts'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import EventsTable, {
    useEventTableColumns,
    type EventTableRow,
} from '@Components/Pages/EventsPage/EventsTable.tsx'
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
    const handleOpenInstance = useCallback(
        (id: number) => navigate(`/instances/${id}`),
        [navigate],
    )
    const eventTableColumns = useEventTableColumns({
        onOpenInstance: handleOpenInstance,
    })

    const [events, setEvents] = useState<Event[] | null>(null)
    const [eventTypes, setEventTypes] = useState<EventType[] | null>(null)
    const [showAddEventForm, setShowAddEventForm] = useState(false)
    const [editTargetEvent, setEditTargetEvent] = useState<Event | null>(null)
    const [viewTargetEvent, setViewTargetEvent] = useState<Event | null>(null)

    const eventTableState = useDataTableState({
        schema: eventSchema,
        columns: eventTableColumns,
        defaultPageSize: pageSize,
        pageSizeOptions: Array.from(new Set([pageSize, 20, 50, 'all'])) as (
            | number
            | 'all'
        )[],
        defaultSorting: {
            field: 'timestamp',
            direction: 'desc',
        },
    })

    const eventsQuery = useMemo(
        () =>
            instanceId === undefined
                ? eventTableState.query
                : {
                      ...eventTableState.query,
                      instance_id: instanceId,
                  },
        [eventTableState.query, instanceId],
    )

    const loadEventTypes = useCallback(async () => {
        setEventTypes(null)

        try {
            const eventTypesResponse = await services.eventsTypesService.list()
            setEventTypes(eventTypesResponse)
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [navigate, services.eventsTypesService])

    const loadEvents = useCallback(async () => {
        setEvents(null)

        try {
            const eventsResponse =
                await services.eventsService.list(eventsQuery)
            setEvents(eventsResponse.map(normalizeEvent))
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }, [eventsQuery, navigate, services.eventsService])

    useEffect(() => {
        loadEventTypes()
    }, [loadEventTypes])

    useEffect(() => {
        loadEvents()
    }, [loadEvents])

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
            await loadEvents()
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
            await loadEvents()
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
            await loadEvents()
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
            <LoadEffect
                data={events && eventTypes ? rows : null}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <EventsTable
                    rows={rows}
                    state={eventTableState}
                    columns={eventTableColumns}
                    showToolbar={showToolbar}
                    compactToolbar={instanceId !== undefined}
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
