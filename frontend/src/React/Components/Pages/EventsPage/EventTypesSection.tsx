import { Plus } from 'lucide-react'
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react'

import type { DataTableColumnSchema } from '@/lib/dataTableSchema.ts'
import { useDataTableState } from '@/lib/useDataTableState.ts'
import CompactDataTableToolbar from '@Components/Common/CompactDataTableToolbar.tsx'
import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import DataTable from '@Components/Common/DataTable.tsx'
import SearchableSelect from '@Components/Common/Forms/SearchableSelect.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import TruncatedText from '@Components/Common/TruncatedText.tsx'
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
import { eventTypeUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    eventTypeSchema,
    objectTypeSchema,
    type EventType,
    type EventTypeAdd,
    type EventTypeUpdate,
    type ObjectType,
} from '@Schemas'
import { useContextMenuStore, useServicesStore } from '@StorageImpl'

type EventTypeColumnId = 'name' | 'id'
type LinkedTypeColumnId = 'name' | 'id' | 'parentId'

function EventTypesSection(): ReactNode {
    const services = useServicesStore(state => state.services)
    const { onContextMenuCall } = useContextMenuStore()

    const [eventTypes, setEventTypes] = useState<EventType[] | null>(null)
    const [allTypes, setAllTypes] = useState<ObjectType[] | null>(null)
    const [linkedTypes, setLinkedTypes] = useState<ObjectType[] | null>(null)
    const [linkedTypeIds, setLinkedTypeIds] = useState<
        readonly number[] | null
    >(null)
    const [selectedEventType, setSelectedEventType] =
        useState<EventType | null>(null)
    const [showAddEventTypeForm, setShowAddEventTypeForm] = useState(false)
    const [editTargetEventType, setEditTargetEventType] =
        useState<EventType | null>(null)
    const [showAddRelationDialog, setShowAddRelationDialog] = useState(false)
    const [selectedTypeIdForRelation, setSelectedTypeIdForRelation] =
        useState<string>('')

    const eventTypeColumns = useMemo(
        (): readonly DataTableColumnSchema<
            EventType,
            typeof eventTypeSchema,
            EventTypeColumnId
        >[] => [
            {
                id: 'name',
                label: 'Название',
                queryField: 'name',
                renderCell: eventType => (
                    <TruncatedText text={eventType.name} maxLength={48} />
                ),
                getValue: eventType => eventType.name,
                getSortValue: eventType => eventType.name,
                visibleByDefault: true,
                hideable: false,
                headerClassName: 'w-[75%]',
                cellClassName: 'overflow-hidden',
                filter: {
                    variant: 'text',
                    operators: ['exact', 'like', 'in'],
                    placeholder: 'Название типа события',
                },
            },
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: eventType => `#${eventType.id}`,
                getValue: eventType => eventType.id,
                getSortValue: eventType => eventType.id,
                visibleByDefault: true,
                headerClassName: 'w-[25%]',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'Например: 3 или 1,2,3',
                },
            },
        ],
        [],
    )

    const linkedTypeColumns = useMemo(
        (): readonly DataTableColumnSchema<
            ObjectType,
            typeof objectTypeSchema,
            LinkedTypeColumnId
        >[] => [
            {
                id: 'name',
                label: 'Название',
                queryField: 'name',
                renderCell: type => (
                    <TruncatedText text={type.name} maxLength={48} />
                ),
                getValue: type => type.name,
                getSortValue: type => type.name,
                visibleByDefault: true,
                hideable: false,
                headerClassName: 'w-[55%]',
                cellClassName: 'overflow-hidden',
                filter: {
                    variant: 'text',
                    operators: ['exact', 'like', 'in'],
                    placeholder: 'Название типа объекта',
                },
            },
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: type => `#${type.id}`,
                getValue: type => type.id,
                getSortValue: type => type.id,
                visibleByDefault: true,
                headerClassName: 'w-[20%]',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'Например: 7 или 1,2,3',
                },
            },
            {
                id: 'parentId',
                label: 'Родитель',
                queryField: 'parent_id',
                renderCell: type =>
                    type.parent_id === null ? '—' : `#${type.parent_id}`,
                getValue: type => type.parent_id,
                visibleByDefault: true,
                headerClassName: 'w-[25%]',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'ID родителя',
                },
            },
        ],
        [],
    )

    const eventTypesTableState = useDataTableState({
        schema: eventTypeSchema,
        columns: eventTypeColumns,
        defaultPageSize: 10,
        pageSizeOptions: [10, 20, 50, 'all'],
        defaultSorting: {
            field: 'name',
            direction: 'asc',
        },
    })

    const linkedTypesTableState = useDataTableState({
        schema: objectTypeSchema,
        columns: linkedTypeColumns,
        defaultPageSize: 10,
        pageSizeOptions: [10, 20, 50, 'all'],
        defaultSorting: {
            field: 'name',
            direction: 'asc',
        },
    })

    const loadEventTypes = useCallback(async (): Promise<void> => {
        setEventTypes(null)

        try {
            const loadedEventTypes = await services.eventsTypesService.list(
                eventTypesTableState.query,
            )
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
    }, [eventTypesTableState.query, services.eventsTypesService])

    const loadAllTypes = useCallback(async (): Promise<void> => {
        try {
            setAllTypes(await services.objectsTypesService.getAllTypes())
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }, [services.objectsTypesService])

    const loadLinkedTypes = useCallback(
        async (eventTypeId: number | null): Promise<void> => {
            if (eventTypeId === null) {
                setLinkedTypeIds([])
                setLinkedTypes([])
                return
            }

            setLinkedTypes(null)

            try {
                const relations = await services.eventTypeRelationsService.list(
                    {
                        event_type_id: eventTypeId,
                    },
                )
                const relationTypeIds = relations.map(
                    relation => relation.type_id,
                )
                setLinkedTypeIds(relationTypeIds)

                if (relationTypeIds.length === 0) {
                    setLinkedTypes([])
                    return
                }

                const requestedIds = Array.isArray(
                    linkedTypesTableState.query.id__in,
                )
                    ? linkedTypesTableState.query.id__in
                    : null

                setLinkedTypes(
                    await services.objectsTypesService.list({
                        ...linkedTypesTableState.query,
                        event_type_id: eventTypeId,
                        id__in: requestedIds
                            ? relationTypeIds.filter(id =>
                                  requestedIds.includes(id),
                              )
                            : relationTypeIds,
                    }),
                )
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        },
        [
            linkedTypesTableState.query,
            services.eventTypeRelationsService,
            services.objectsTypesService,
        ],
    )

    useEffect(() => {
        setEventTypes(null)
        void loadEventTypes()
    }, [loadEventTypes])

    useEffect(() => {
        setAllTypes(null)
        void loadAllTypes()
    }, [loadAllTypes])

    useEffect(() => {
        void loadLinkedTypes(selectedEventType?.id ?? null)
    }, [loadLinkedTypes, selectedEventType?.id])

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
        const linkedIds = new Set(linkedTypeIds ?? [])
        return (allTypes ?? []).filter(type => !linkedIds.has(type.id))
    }, [allTypes, linkedTypeIds])

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
                onAddRequest: selectedEventType
                    ? () => setShowAddRelationDialog(true)
                    : undefined,
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

    function openContextMenu<T>(
        event: MouseEvent<HTMLElement>,
        element: T,
        options: ReturnType<typeof buildContextMenuOptions<T>>,
    ): void {
        if (!hasContextMenuActions(options)) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        onContextMenuCall(
            event,
            { x: event.clientX, y: event.clientY },
            element,
            options,
        )
    }

    return (
        <>
            <div className='mt-4 grid gap-4 xl:grid-cols-2'>
                <Card>
                    <CardHeader>
                        <CardTitle>Типы событий</CardTitle>
                        <CardDescription className='min-h-10'>
                            Выберите тип события слева, чтобы управлять его
                            привязками.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <CompactDataTableToolbar
                            state={eventTypesTableState}
                            columns={eventTypeColumns}
                            actions={
                                <ToolbarActionButton
                                    type='button'
                                    variant='default'
                                    icon={<Plus />}
                                    label='Добавить'
                                    aria-label='Добавить тип события'
                                    onClick={() =>
                                        setShowAddEventTypeForm(true)
                                    }
                                />
                            }
                        />

                        <LoadEffect
                            data={eventTypes}
                            contentSize={{ height: '24px', width: '100%' }}
                        >
                            <DataTable
                                state={eventTypesTableState}
                                columns={eventTypeColumns}
                                rows={eventTypes ?? []}
                                processingMode='manual'
                                getRowId={eventType => eventType.id}
                                emptyMessage='Нет типов событий'
                                tableClassName='table-fixed'
                                rowClassName={eventType =>
                                    selectedEventType?.id === eventType.id
                                        ? 'bg-primary/5 hover:bg-primary/10'
                                        : undefined
                                }
                                onRowClick={eventType =>
                                    setSelectedEventType(eventType)
                                }
                                onRowContextMenu={(event, eventType) =>
                                    openContextMenu(
                                        event,
                                        eventType,
                                        eventTypeMenuOptions,
                                    )
                                }
                                onEmptyContextMenu={event =>
                                    openContextMenu(
                                        event,
                                        {} as EventType,
                                        addOnlyEventTypeOptions,
                                    )
                                }
                            />
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
                    <CardContent className='space-y-4'>
                        <CompactDataTableToolbar
                            state={linkedTypesTableState}
                            columns={linkedTypeColumns}
                            actions={
                                <ToolbarActionButton
                                    type='button'
                                    variant='default'
                                    icon={<Plus />}
                                    label='Добавить'
                                    aria-label='Добавить связь с типом объекта'
                                    disabled={!selectedEventType}
                                    onClick={() =>
                                        setShowAddRelationDialog(true)
                                    }
                                />
                            }
                        />

                        <LoadEffect
                            data={linkedTypes}
                            contentSize={{ height: '24px', width: '100%' }}
                        >
                            {!selectedEventType ? (
                                <div className='text-muted-foreground rounded-md border py-8 text-center text-sm'>
                                    Выберите тип события, чтобы управлять
                                    привязками.
                                </div>
                            ) : (
                                <DataTable
                                    state={linkedTypesTableState}
                                    columns={linkedTypeColumns}
                                    rows={linkedTypes ?? []}
                                    processingMode='manual'
                                    getRowId={type => type.id}
                                    emptyMessage='Нет привязанных типов объектов'
                                    tableClassName='table-fixed'
                                    onRowContextMenu={(event, type) =>
                                        openContextMenu(
                                            event,
                                            type,
                                            relationMenuOptions,
                                        )
                                    }
                                    onEmptyContextMenu={event =>
                                        openContextMenu(
                                            event,
                                            {} as ObjectType,
                                            addOnlyRelationOptions,
                                        )
                                    }
                                />
                            )}
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
                        <SearchableSelect
                            value={selectedTypeIdForRelation}
                            onValueChange={setSelectedTypeIdForRelation}
                            placeholder='Выберите тип объекта'
                            searchPlaceholder='Поиск типа объекта...'
                            options={availableTypesForRelation.map(type => ({
                                label: `${type.name} (#${type.id})`,
                                value: String(type.id),
                            }))}
                        />
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
