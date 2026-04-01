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
import { Input } from '@Components/ui/input'
import { Label } from '@Components/ui/label'
import { Slider } from '@Components/ui/slider'
import { eventTypeUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    eventTypeSchema,
    type EventType,
    type EventTypeUpdate,
    type ObjectType,
} from '@Schemas'
import { useContextMenuStore, useServicesStore } from '@StorageImpl'

interface Props {
    objectType: ObjectType
}

type TypeEventTypesColumnId = 'name' | 'id'

function TypeEventTypesTab({ objectType }: Props): ReactNode {
    const services = useServicesStore(state => state.services)
    const { onContextMenuCall } = useContextMenuStore()

    const [eventTypes, setEventTypes] = useState<EventType[] | null>(null)
    const [allEventTypes, setAllEventTypes] = useState<EventType[] | null>(null)
    const [linkedEventTypeIds, setLinkedEventTypeIds] = useState<
        readonly number[] | null
    >(null)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [pendingName, setPendingName] = useState('')
    const [selectedExistingEventTypeId, setSelectedExistingEventTypeId] =
        useState('')
    const [createWhenMissing, setCreateWhenMissing] = useState([100])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editTarget, setEditTarget] = useState<EventType | null>(null)

    const columns = useMemo(
        (): readonly DataTableColumnSchema<
            EventType,
            typeof eventTypeSchema,
            TypeEventTypesColumnId
        >[] => [
            {
                id: 'name',
                label: 'Название',
                queryField: 'name',
                renderCell: eventType => (
                    <TruncatedText text={eventType.name} maxLength={56} />
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
                    placeholder: 'Например: 1 или 1,2,3',
                },
            },
        ],
        [],
    )

    const tableState = useDataTableState({
        schema: eventTypeSchema,
        columns,
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
            const relations = await services.eventTypeRelationsService.list({
                type_id: objectType.id,
            })
            const relationIds = relations.map(
                relation => relation.event_type_id,
            )
            setLinkedEventTypeIds(relationIds)

            if (relationIds.length === 0) {
                setEventTypes([])
                return
            }

            const requestedIds = Array.isArray(tableState.query.id__in)
                ? tableState.query.id__in
                : null

            setEventTypes(
                await services.eventsTypesService.list({
                    ...tableState.query,
                    id__in: requestedIds
                        ? relationIds.filter(id => requestedIds.includes(id))
                        : relationIds,
                }),
            )
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }, [
        objectType.id,
        services.eventTypeRelationsService,
        services.eventsTypesService,
        tableState.query,
    ])

    useEffect(() => {
        void loadEventTypes()
    }, [loadEventTypes])

    useEffect(() => {
        async function loadAllEventTypes(): Promise<void> {
            try {
                setAllEventTypes(await services.eventsTypesService.list())
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        void loadAllEventTypes()
    }, [services.eventsTypesService])

    async function handleDelete(eventType: EventType): Promise<void> {
        try {
            await services.eventTypeRelationsService.delete(
                eventType.id,
                objectType.id,
            )
            await loadEventTypes()
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    async function handleEditSubmit(
        data: EventTypeUpdate | null,
    ): Promise<void> {
        if (!editTarget || !data) {
            setEditTarget(null)
            return
        }

        try {
            await services.eventsTypesService.update(editTarget.id, data)
            setEditTarget(null)
            await loadEventTypes()
            setAllEventTypes(await services.eventsTypesService.list())
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleSubmitAdd(): Promise<void> {
        setIsSubmitting(true)
        try {
            const normalizedName = pendingName.trim()
            const availableEventTypesForRelation = (allEventTypes ?? []).filter(
                eventType => !(linkedEventTypeIds ?? []).includes(eventType.id),
            )
            const selectedExistingEventType =
                availableEventTypesForRelation.find(
                    eventType =>
                        String(eventType.id) === selectedExistingEventTypeId,
                ) ??
                availableEventTypesForRelation.find(
                    eventType =>
                        eventType.name.toLowerCase() ===
                        normalizedName.toLowerCase(),
                )

            if (!selectedExistingEventType && !normalizedName) {
                alert(
                    'Выберите существующий тип события или введите имя нового',
                )
                return
            }

            if (!selectedExistingEventType && createWhenMissing[0] < 50) {
                alert(
                    'Новый тип события создавать нельзя. Выберите существующий.',
                )
                return
            }

            const matchedEventType =
                selectedExistingEventType ??
                (await services.eventsTypesService.create({
                    name: normalizedName,
                }))

            await services.eventTypeRelationsService.create({
                event_type_id: matchedEventType.id,
                type_id: objectType.id,
            })

            setPendingName('')
            setSelectedExistingEventTypeId('')
            setCreateWhenMissing([100])
            setIsAddDialogOpen(false)
            await loadEventTypes()
            setAllEventTypes(await services.eventsTypesService.list())
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const itemContextMenuOptions = useMemo(
        () =>
            buildContextMenuOptions<EventType>({
                onAddRequest: () => setIsAddDialogOpen(true),
                onChangeRequest: eventType => setEditTarget(eventType),
                onDeleteRequest: eventType => {
                    void handleDelete(eventType)
                },
            }),
        [objectType.id],
    )

    const emptyContextMenuOptions = useMemo(
        () =>
            buildContextMenuOptions<EventType>({
                onAddRequest: () => setIsAddDialogOpen(true),
            }),
        [],
    )

    const availableEventTypesForRelation = useMemo(() => {
        const linkedIds = new Set(linkedEventTypeIds ?? [])
        return (allEventTypes ?? []).filter(type => !linkedIds.has(type.id))
    }, [allEventTypes, linkedEventTypeIds])

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
            <Card className='mt-4'>
                <CardHeader>
                    <CardTitle>Типы событий</CardTitle>
                    <CardDescription>
                        Которые можно применять к данному типу
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    <CompactDataTableToolbar
                        state={tableState}
                        columns={columns}
                        actions={
                            <ToolbarActionButton
                                type='button'
                                variant='default'
                                icon={<Plus />}
                                label='Добавить'
                                aria-label='Добавить связь с типом события'
                                onClick={() => setIsAddDialogOpen(true)}
                            />
                        }
                    />

                    <LoadEffect
                        data={eventTypes}
                        contentSize={{ height: '24px', width: '100%' }}
                    >
                        <DataTable
                            state={tableState}
                            columns={columns}
                            rows={eventTypes ?? []}
                            processingMode='manual'
                            getRowId={eventType => eventType.id}
                            emptyMessage='Нет привязанных типов событий'
                            tableClassName='table-fixed'
                            onRowClick={eventType => setEditTarget(eventType)}
                            onRowContextMenu={(event, eventType) =>
                                openContextMenu(
                                    event,
                                    eventType,
                                    itemContextMenuOptions,
                                )
                            }
                            onEmptyContextMenu={event =>
                                openContextMenu(
                                    event,
                                    {} as EventType,
                                    emptyContextMenuOptions,
                                )
                            }
                        />
                    </LoadEffect>
                </CardContent>
            </Card>

            <Dialog
                open={isAddDialogOpen}
                onOpenChange={open => {
                    if (!isSubmitting) {
                        setIsAddDialogOpen(open)
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Добавить тип события для "{objectType.name}"
                        </DialogTitle>
                    </DialogHeader>

                    <div className='space-y-5'>
                        <div className='space-y-2'>
                            <Label>Существующий тип события</Label>
                            <SearchableSelect
                                value={selectedExistingEventTypeId}
                                onValueChange={setSelectedExistingEventTypeId}
                                placeholder='Найдите и выберите существующий тип'
                                searchPlaceholder='Поиск типа события...'
                                options={availableEventTypesForRelation.map(
                                    eventType => ({
                                        label: `${eventType.name} (#${eventType.id})`,
                                        value: String(eventType.id),
                                    }),
                                )}
                            />
                            <p className='text-muted-foreground text-sm'>
                                Если существующий тип выбран, будет привязан
                                именно он.
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='event-type-name'>
                                Название нового типа события
                            </Label>
                            <Input
                                id='event-type-name'
                                value={pendingName}
                                onChange={event =>
                                    setPendingName(event.target.value)
                                }
                                placeholder='Например: Плановое обслуживание'
                            />
                        </div>

                        <div className='space-y-3'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='min-w-0 flex-1'>
                                    <Label>
                                        Создавать новый тип, если имя не найдено
                                    </Label>
                                    <p className='text-muted-foreground text-sm'>
                                        Если существующий тип не выбран, форма
                                        попробует найти точное совпадение по
                                        имени. При его отсутствии новый тип
                                        будет создан только если слайдер
                                        включён.
                                    </p>
                                </div>
                                <div className='flex w-full max-w-40 shrink-0 items-center gap-3'>
                                    <Slider
                                        min={0}
                                        max={100}
                                        step={100}
                                        value={createWhenMissing}
                                        onValueChange={setCreateWhenMissing}
                                    />
                                    <span className='text-sm font-medium whitespace-nowrap'>
                                        {createWhenMissing[0] >= 50
                                            ? 'Да'
                                            : 'Нет'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant='outline'
                            disabled={isSubmitting}
                            onClick={() => setIsAddDialogOpen(false)}
                        >
                            Отмена
                        </Button>
                        <Button
                            disabled={isSubmitting}
                            onClick={() => void handleSubmitAdd()}
                        >
                            Привязать
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {editTarget && (
                <EditEntityForm
                    schema={eventTypeSchema}
                    uiSchema={eventTypeUiSchema}
                    context={{}}
                    source={editTarget}
                    title={`Изменение типа события "${editTarget.name}"`}
                    submitCallback={handleEditSubmit}
                />
            )}
        </>
    )
}

export default TypeEventTypesTab
