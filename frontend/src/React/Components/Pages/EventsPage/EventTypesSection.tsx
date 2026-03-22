import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import { Button } from '@Components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@Components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@Components/ui/dialog'
import { Label } from '@Components/ui/label'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@Components/ui/pagination'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@Components/ui/select'
import { eventTypeUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    eventTypeSchema,
    type EventType,
    type EventTypeAdd,
    type EventTypeUpdate,
    type ObjectType,
} from '@Schemas'
import { useContextMenuStore, useServicesStore } from '@StorageImpl'
import {
    useEffect,
    useMemo,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react'

const PAGE_SIZE = 8

function EventTypesSection(): ReactNode {
    const services = useServicesStore(state => state.services)
    const { onContextMenuCall } = useContextMenuStore()

    const [eventTypes, setEventTypes] = useState<EventType[] | null>(null)
    const [allTypes, setAllTypes] = useState<ObjectType[] | null>(null)
    const [linkedTypes, setLinkedTypes] = useState<ObjectType[] | null>(null)
    const [selectedEventType, setSelectedEventType] =
        useState<EventType | null>(null)
    const [showAddEventTypeForm, setShowAddEventTypeForm] = useState(false)
    const [editTargetEventType, setEditTargetEventType] =
        useState<EventType | null>(null)
    const [showAddRelationDialog, setShowAddRelationDialog] = useState(false)
    const [selectedTypeIdForRelation, setSelectedTypeIdForRelation] =
        useState<string>('')
    const [eventTypesPage, setEventTypesPage] = useState(1)
    const [linkedTypesPage, setLinkedTypesPage] = useState(1)

    async function loadEventTypes(): Promise<void> {
        try {
            const loadedEventTypes = await services.eventsTypesService.list()
            setEventTypes(loadedEventTypes)
            setSelectedEventType(current => {
                if (!loadedEventTypes.length) {
                    return null
                }

                if (current) {
                    return (
                        loadedEventTypes.find(item => item.id === current.id) ??
                        loadedEventTypes[0]
                    )
                }

                return loadedEventTypes[0]
            })
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function loadAllTypes(): Promise<void> {
        try {
            setAllTypes(await services.objectsTypesService.getAllTypes())
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function loadLinkedTypes(eventTypeId: number | null): Promise<void> {
        if (eventTypeId === null) {
            setLinkedTypes([])
            return
        }

        try {
            setLinkedTypes(
                await services.eventTypeRelationsService.getTypesByEventTypeId(
                    eventTypeId,
                ),
            )
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    useEffect(() => {
        setEventTypes(null)
        setAllTypes(null)
        void Promise.all([loadEventTypes(), loadAllTypes()])
    }, [])

    useEffect(() => {
        setLinkedTypes(null)
        void loadLinkedTypes(selectedEventType?.id ?? null)
    }, [selectedEventType?.id])

    useEffect(() => {
        setEventTypesPage(1)
    }, [eventTypes?.length])

    useEffect(() => {
        setLinkedTypesPage(1)
    }, [linkedTypes?.length, selectedEventType?.id])

    async function handleCreateEventType(
        data: EventTypeAdd | null,
    ): Promise<void> {
        setShowAddEventTypeForm(false)
        if (!data) {
            return
        }

        try {
            await services.eventsTypesService.create(data)
            await loadEventTypes()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleUpdateEventType(
        data: EventTypeUpdate | null,
    ): Promise<void> {
        if (!editTargetEventType || !data) {
            setEditTargetEventType(null)
            return
        }

        try {
            await services.eventsTypesService.update(
                editTargetEventType.id,
                data,
            )
            setEditTargetEventType(null)
            await loadEventTypes()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleDeleteEventType(eventType: EventType): Promise<void> {
        try {
            await services.eventsTypesService.delete(eventType.id)
            await loadEventTypes()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleDeleteRelation(type: ObjectType): Promise<void> {
        if (!selectedEventType) {
            return
        }

        try {
            await services.eventTypeRelationsService.delete(
                selectedEventType.id,
                type.id,
            )
            await loadLinkedTypes(selectedEventType.id)
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleCreateRelation(): Promise<void> {
        if (!selectedEventType || !selectedTypeIdForRelation) {
            return
        }

        try {
            await services.eventTypeRelationsService.create({
                event_type_id: selectedEventType.id,
                type_id: Number(selectedTypeIdForRelation),
            })
            setShowAddRelationDialog(false)
            setSelectedTypeIdForRelation('')
            await loadLinkedTypes(selectedEventType.id)
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    const availableTypesForRelation = useMemo(() => {
        const linkedIds = new Set((linkedTypes ?? []).map(type => type.id))
        return (allTypes ?? []).filter(type => !linkedIds.has(type.id))
    }, [allTypes, linkedTypes])

    useEffect(() => {
        if (!showAddRelationDialog) {
            return
        }

        const first = availableTypesForRelation[0]
        setSelectedTypeIdForRelation(first ? String(first.id) : '')
    }, [showAddRelationDialog, availableTypesForRelation])

    const eventTypeMenuOptions = useMemo(
        () =>
            buildContextMenuOptions<EventType>({
                onAddRequest: () => setShowAddEventTypeForm(true),
                onChangeRequest: eventType => setEditTargetEventType(eventType),
                onDeleteRequest: eventType => {
                    void handleDeleteEventType(eventType)
                },
            }),
        [],
    )

    const relationMenuOptions = useMemo(
        () =>
            buildContextMenuOptions<ObjectType>({
                onAddRequest: () => setShowAddRelationDialog(true),
                onDeleteRequest: type => {
                    void handleDeleteRelation(type)
                },
            }),
        [selectedEventType?.id],
    )

    const addOnlyEventTypeOptions = useMemo(
        () =>
            buildContextMenuOptions<EventType>({
                onAddRequest: () => setShowAddEventTypeForm(true),
            }),
        [],
    )

    const addOnlyRelationOptions = useMemo(
        () =>
            buildContextMenuOptions<ObjectType>({
                onAddRequest: selectedEventType
                    ? () => setShowAddRelationDialog(true)
                    : undefined,
            }),
        [selectedEventType?.id],
    )

    const eventTypesTotalPages = Math.max(
        1,
        Math.ceil((eventTypes ?? []).length / PAGE_SIZE),
    )
    const linkedTypesTotalPages = Math.max(
        1,
        Math.ceil((linkedTypes ?? []).length / PAGE_SIZE),
    )

    const visibleEventTypes = useMemo(() => {
        const from = (eventTypesPage - 1) * PAGE_SIZE
        return (eventTypes ?? []).slice(from, from + PAGE_SIZE)
    }, [eventTypes, eventTypesPage])

    const visibleLinkedTypes = useMemo(() => {
        const from = (linkedTypesPage - 1) * PAGE_SIZE
        return (linkedTypes ?? []).slice(from, from + PAGE_SIZE)
    }, [linkedTypes, linkedTypesPage])

    function openContextMenu<T>(
        e: MouseEvent<HTMLElement>,
        element: T,
        options: ReturnType<typeof buildContextMenuOptions<T>>,
    ): void {
        if (!hasContextMenuActions(options)) {
            return
        }

        e.preventDefault()
        e.stopPropagation()
        onContextMenuCall(e, { x: e.clientX, y: e.clientY }, element, options)
    }

    return (
        <>
            <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Типы событий</CardTitle>
                        <CardDescription className='min-h-10'>
                            Правый клик по списку или элементу для управления
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LoadEffect
                            data={eventTypes}
                            contentSize={{ height: '24px', width: '100%' }}
                        >
                            <div
                                className='overflow-hidden rounded-md border'
                                onContextMenu={e =>
                                    openContextMenu(
                                        e,
                                        {} as EventType,
                                        addOnlyEventTypeOptions,
                                    )
                                }
                            >
                                {eventTypes && eventTypes.length > 0 ? (
                                    visibleEventTypes.map(
                                        (eventType, index) => (
                                            <div
                                                key={eventType.id}
                                                className={`hover:bg-accent/40 flex min-h-12 cursor-pointer items-center justify-between px-3 py-2 transition-colors ${
                                                    selectedEventType?.id ===
                                                    eventType.id
                                                        ? 'border-primary bg-primary/5 ring-primary/20 relative z-10 border-l-4 shadow-sm'
                                                        : ''
                                                } ${
                                                    index <
                                                    visibleEventTypes.length - 1
                                                        ? 'border-b'
                                                        : ''
                                                }`}
                                                onClick={() =>
                                                    setSelectedEventType(
                                                        eventType,
                                                    )
                                                }
                                                onContextMenu={e =>
                                                    openContextMenu(
                                                        e,
                                                        eventType,
                                                        eventTypeMenuOptions,
                                                    )
                                                }
                                            >
                                                <div className='min-w-0'>
                                                    <div className='font-medium'>
                                                        {eventType.name}
                                                    </div>
                                                    <div className='text-muted-foreground text-sm'>
                                                        ID #{eventType.id}
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )
                                ) : (
                                    <div className='text-muted-foreground py-8 text-center text-sm'>
                                        Нет типов событий. Правый клик для
                                        добавления.
                                    </div>
                                )}
                            </div>
                            {eventTypes && eventTypes.length > PAGE_SIZE ? (
                                <Pagination className='mt-4'>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href='#'
                                                aria-disabled={
                                                    eventTypesPage <= 1
                                                }
                                                className={
                                                    eventTypesPage <= 1
                                                        ? 'pointer-events-none opacity-50'
                                                        : undefined
                                                }
                                                onClick={event => {
                                                    event.preventDefault()
                                                    if (eventTypesPage <= 1) {
                                                        return
                                                    }
                                                    setEventTypesPage(page =>
                                                        Math.max(1, page - 1),
                                                    )
                                                }}
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink
                                                size='default'
                                                isActive
                                            >
                                                {eventTypesPage} /{' '}
                                                {eventTypesTotalPages}
                                            </PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                href='#'
                                                aria-disabled={
                                                    eventTypesPage >=
                                                    eventTypesTotalPages
                                                }
                                                className={
                                                    eventTypesPage >=
                                                    eventTypesTotalPages
                                                        ? 'pointer-events-none opacity-50'
                                                        : undefined
                                                }
                                                onClick={event => {
                                                    event.preventDefault()
                                                    if (
                                                        eventTypesPage >=
                                                        eventTypesTotalPages
                                                    ) {
                                                        return
                                                    }
                                                    setEventTypesPage(page =>
                                                        Math.min(
                                                            eventTypesTotalPages,
                                                            page + 1,
                                                        ),
                                                    )
                                                }}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            ) : null}
                        </LoadEffect>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Привязки к типам</CardTitle>
                        <CardDescription className='min-h-10'>
                            {selectedEventType
                                ? `Типы объектов, для которых доступен "${selectedEventType.name}".`
                                : 'Выберите тип события слева.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <LoadEffect
                            data={linkedTypes}
                            contentSize={{ height: '24px', width: '100%' }}
                        >
                            <div
                                className='overflow-hidden rounded-md border'
                                onContextMenu={e =>
                                    openContextMenu(
                                        e,
                                        {} as ObjectType,
                                        addOnlyRelationOptions,
                                    )
                                }
                            >
                                {!selectedEventType ? (
                                    <div className='text-muted-foreground py-8 text-center text-sm'>
                                        Выберите тип события, чтобы управлять
                                        привязками.
                                    </div>
                                ) : linkedTypes && linkedTypes.length > 0 ? (
                                    visibleLinkedTypes.map((type, index) => (
                                        <div
                                            key={type.id}
                                            className={`hover:bg-accent/40 flex min-h-12 items-center px-3 py-2 ${
                                                index <
                                                visibleLinkedTypes.length - 1
                                                    ? 'border-b'
                                                    : ''
                                            }`}
                                            onContextMenu={e =>
                                                openContextMenu(
                                                    e,
                                                    type,
                                                    relationMenuOptions,
                                                )
                                            }
                                        >
                                            <div className='min-w-0'>
                                                <div className='font-medium'>
                                                    {type.name}
                                                </div>
                                                <div className='text-muted-foreground text-sm'>
                                                    ID #{type.id}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className='text-muted-foreground py-8 text-center text-sm'>
                                        Нет привязанных типов. Правый клик для
                                        добавления.
                                    </div>
                                )}
                            </div>
                            {selectedEventType &&
                            linkedTypes &&
                            linkedTypes.length > PAGE_SIZE ? (
                                <Pagination className='mt-4'>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href='#'
                                                aria-disabled={
                                                    linkedTypesPage <= 1
                                                }
                                                className={
                                                    linkedTypesPage <= 1
                                                        ? 'pointer-events-none opacity-50'
                                                        : undefined
                                                }
                                                onClick={event => {
                                                    event.preventDefault()
                                                    if (linkedTypesPage <= 1) {
                                                        return
                                                    }
                                                    setLinkedTypesPage(page =>
                                                        Math.max(1, page - 1),
                                                    )
                                                }}
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationLink
                                                size='default'
                                                isActive
                                            >
                                                {linkedTypesPage} /{' '}
                                                {linkedTypesTotalPages}
                                            </PaginationLink>
                                        </PaginationItem>
                                        <PaginationItem>
                                            <PaginationNext
                                                href='#'
                                                aria-disabled={
                                                    linkedTypesPage >=
                                                    linkedTypesTotalPages
                                                }
                                                className={
                                                    linkedTypesPage >=
                                                    linkedTypesTotalPages
                                                        ? 'pointer-events-none opacity-50'
                                                        : undefined
                                                }
                                                onClick={event => {
                                                    event.preventDefault()
                                                    if (
                                                        linkedTypesPage >=
                                                        linkedTypesTotalPages
                                                    ) {
                                                        return
                                                    }
                                                    setLinkedTypesPage(page =>
                                                        Math.min(
                                                            linkedTypesTotalPages,
                                                            page + 1,
                                                        ),
                                                    )
                                                }}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            ) : null}
                        </LoadEffect>
                    </CardContent>
                </Card>
            </div>

            {showAddEventTypeForm && (
                <AddEntityForm
                    schema={eventTypeSchema}
                    uiSchema={eventTypeUiSchema}
                    context={{}}
                    defaults={{ name: '' }}
                    title='Добавление типа события'
                    submitCallback={handleCreateEventType}
                />
            )}

            {editTargetEventType && (
                <EditEntityForm
                    schema={eventTypeSchema}
                    uiSchema={eventTypeUiSchema}
                    context={{}}
                    source={editTargetEventType}
                    title={`Изменение типа события "${editTargetEventType.name}"`}
                    submitCallback={handleUpdateEventType}
                />
            )}

            <Dialog
                open={showAddRelationDialog}
                onOpenChange={open => setShowAddRelationDialog(open)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Привязать тип объекта к типу события
                        </DialogTitle>
                    </DialogHeader>

                    <div className='space-y-2'>
                        <Label>Тип объекта</Label>
                        <Select
                            value={selectedTypeIdForRelation}
                            onValueChange={setSelectedTypeIdForRelation}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Выберите тип объекта' />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTypesForRelation.map(type => (
                                    <SelectItem
                                        key={type.id}
                                        value={String(type.id)}
                                    >
                                        {type.name} (#{type.id})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => setShowAddRelationDialog(false)}
                        >
                            Отмена
                        </Button>
                        <Button
                            disabled={!selectedTypeIdForRelation}
                            onClick={() => void handleCreateRelation()}
                        >
                            Привязать
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default EventTypesSection
