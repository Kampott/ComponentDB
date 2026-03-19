import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import { Button } from '@Components/ui/button'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@Components/ui/pagination'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@Components/ui/table'
import type { Event } from '@Schemas'
import { useContextMenuStore } from '@StorageImpl'
import {
    useEffect,
    useMemo,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react'

export interface EventTableRow {
    event: Event
    eventTypeName: string
}

interface Props {
    rows: EventTableRow[]
    pageSize?: number
    emptyMessage?: ReactNode
    onViewRequest?: (event: Event) => void
    onAddRequest?: (event: Event) => void
    onChangeRequest?: (event: Event) => void
    onDeleteRequest?: (event: Event) => void
    onOpenInstance: (instanceId: number) => void
}

function toTimestamp(value: Date): string {
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
        return String(value)
    }
    return date.toLocaleString('ru-RU')
}

function EventsTable({
    rows,
    pageSize = 10,
    emptyMessage = 'Событий пока нет',
    onViewRequest,
    onAddRequest,
    onChangeRequest,
    onDeleteRequest,
    onOpenInstance,
}: Props): ReactNode {
    const { onContextMenuCall } = useContextMenuStore()
    const [page, setPage] = useState(1)

    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages)
        }
    }, [page, totalPages])

    useEffect(() => {
        setPage(1)
    }, [rows.length])

    const visibleRows = useMemo(() => {
        const from = (page - 1) * pageSize
        return rows.slice(from, from + pageSize)
    }, [rows, page, pageSize])

    const contextMenuOptions = buildContextMenuOptions<Event>({
        onViewRequest,
        onAddRequest,
        onChangeRequest,
        onDeleteRequest,
    })
    const isContextMenuEnabled = hasContextMenuActions(contextMenuOptions)
    const emptyContextMenuOptions = buildContextMenuOptions<Event>({
        onAddRequest,
    })
    const isEmptyContextMenuEnabled = hasContextMenuActions(
        emptyContextMenuOptions,
    )

    function handleContextMenu(e: MouseEvent<HTMLElement>, event: Event) {
        if (!isContextMenuEnabled) {
            return
        }

        onContextMenuCall(
            e,
            { x: e.clientX, y: e.clientY },
            event,
            contextMenuOptions,
        )
    }

    function handleEmptyTableContextMenu(e: MouseEvent<HTMLElement>) {
        if (!isEmptyContextMenuEnabled) {
            return
        }

        onContextMenuCall(
            e,
            { x: e.clientX, y: e.clientY },
            {} as Event,
            emptyContextMenuOptions,
        )
    }

    return (
        <div className='space-y-4'>
            <div
                className='overflow-hidden rounded-md border'
                onContextMenu={
                    visibleRows.length === 0
                        ? handleEmptyTableContextMenu
                        : undefined
                }
            >
                <Table className='table-fixed'>
                    <TableHeader>
                        <TableRow>
                            <TableHead className='w-1/4'>id</TableHead>
                            <TableHead className='w-1/4'>Тип</TableHead>
                            <TableHead className='w-1/4'>Дата</TableHead>
                            <TableHead className='w-1/4'>Экземпляр</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleRows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className='py-8 text-center'
                                >
                                    <span className='text-muted-foreground text-sm'>
                                        {emptyMessage}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleRows.map(row => (
                                <TableRow
                                    key={row.event.id}
                                    className={
                                        onViewRequest
                                            ? 'cursor-pointer'
                                            : undefined
                                    }
                                    onClick={() => onViewRequest?.(row.event)}
                                    onContextMenu={e =>
                                        handleContextMenu(e, row.event)
                                    }
                                >
                                    <TableCell>#{row.event.id}</TableCell>
                                    <TableCell>{row.eventTypeName}</TableCell>
                                    <TableCell>
                                        {toTimestamp(row.event.timestamp)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant='link'
                                            className='h-auto p-0'
                                            onClick={e => {
                                                e.stopPropagation()
                                                onOpenInstance(
                                                    row.event.instance_id,
                                                )
                                            }}
                                        >
                                            Экземпляр #{row.event.instance_id}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href='#'
                            aria-disabled={page <= 1}
                            className={
                                page <= 1
                                    ? 'pointer-events-none opacity-50'
                                    : undefined
                            }
                            onClick={event => {
                                event.preventDefault()
                                if (page <= 1) {
                                    return
                                }
                                setPage(previous => Math.max(1, previous - 1))
                            }}
                        />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink size='default' isActive>
                            {page} / {totalPages}
                        </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationNext
                            href='#'
                            aria-disabled={page >= totalPages}
                            className={
                                page >= totalPages
                                    ? 'pointer-events-none opacity-50'
                                    : undefined
                            }
                            onClick={event => {
                                event.preventDefault()
                                if (page >= totalPages) {
                                    return
                                }
                                setPage(previous =>
                                    Math.min(totalPages, previous + 1),
                                )
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    )
}

export default EventsTable
