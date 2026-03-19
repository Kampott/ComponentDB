import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
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
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import {
    eventTypeSchema,
    type EventType,
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

interface Props {
    objectType: ObjectType
}

function TypeEventTypesTab({ objectType }: Props): ReactNode {
    const services = useServicesStore(state => state.services)
    const { onContextMenuCall } = useContextMenuStore()

    const [eventTypes, setEventTypes] = useState<EventType[] | null>(null)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [pendingName, setPendingName] = useState('')
    const [createWhenMissing, setCreateWhenMissing] = useState([100])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editTarget, setEditTarget] = useState<EventType | null>(null)

    async function loadEventTypes(): Promise<void> {
        setEventTypes(null)
        try {
            setEventTypes(
                await services.eventsTypesService.getEventTypesByTypeId(
                    objectType.id,
                ),
            )
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    useEffect(() => {
        loadEventTypes()
    }, [objectType.id])

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
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
                setFormErrors: errors => alert(errors),
            })
        }
    }

    async function handleSubmitAdd(): Promise<void> {
        const name = pendingName.trim()
        if (!name) {
            alert('Введите название типа события')
            return
        }

        setIsSubmitting(true)
        try {
            const existing = await services.eventsTypesService.list({ name })
            const matchedEventType =
                existing[0] ??
                (await services.eventsTypesService.create({
                    name,
                }))

            await services.eventTypeRelationsService.create({
                event_type_id: matchedEventType.id,
                type_id: objectType.id,
            })

            setPendingName('')
            setCreateWhenMissing([100])
            setIsAddDialogOpen(false)
            await loadEventTypes()
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

    const isItemContextMenuEnabled = hasContextMenuActions(
        itemContextMenuOptions,
    )
    const isEmptyContextMenuEnabled = hasContextMenuActions(
        emptyContextMenuOptions,
    )

    function handleItemContextMenu(
        e: MouseEvent<HTMLElement>,
        eventType: EventType,
    ): void {
        if (!isItemContextMenuEnabled) {
            return
        }

        e.stopPropagation()
        onContextMenuCall(
            e,
            { x: e.clientX, y: e.clientY },
            eventType,
            itemContextMenuOptions,
        )
    }

    function handleContainerContextMenu(e: MouseEvent<HTMLElement>): void {
        if (!isEmptyContextMenuEnabled) {
            return
        }

        onContextMenuCall(
            e,
            { x: e.clientX, y: e.clientY },
            {} as EventType,
            emptyContextMenuOptions,
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
                <CardContent>
                    <LoadEffect
                        data={eventTypes}
                        contentSize={{ height: '24px', width: '100%' }}
                    >
                        <div
                            className='overflow-hidden rounded-md border'
                            onContextMenu={handleContainerContextMenu}
                        >
                            {eventTypes && eventTypes.length > 0 ? (
                                eventTypes.map((eventType, index) => (
                                    <div
                                        key={eventType.id}
                                        className={`hover:bg-accent/40 flex min-h-12 cursor-pointer items-center justify-between px-3 py-2 ${
                                            index < eventTypes.length - 1
                                                ? 'border-b'
                                                : ''
                                        }`}
                                        onClick={() => setEditTarget(eventType)}
                                        onContextMenu={e =>
                                            handleItemContextMenu(e, eventType)
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
                                ))
                            ) : (
                                <div className='text-muted-foreground py-8 text-center text-sm'>
                                    Нет привязанных типов событий. Правый клик
                                    для добавления.
                                </div>
                            )}
                        </div>
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
                            <Label htmlFor='event-type-name'>
                                Название типа события
                            </Label>
                            <Input
                                id='event-type-name'
                                value={pendingName}
                                onChange={e => setPendingName(e.target.value)}
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
                                        Слайдер пока mock-only. Под капотом
                                        всегда сначала ищем существующий тип по
                                        имени, а затем создаём новый только если
                                        совпадение не найдено.
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
