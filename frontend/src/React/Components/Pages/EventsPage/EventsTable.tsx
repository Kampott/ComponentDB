import { Plus } from 'lucide-react'
import { useMemo, type MouseEvent, type ReactNode } from 'react'

import type { DataTableColumnSchema } from '@/lib/dataTableSchema.ts'
import type { DataTableStateResult } from '@/lib/useDataTableState.ts'
import CompactDataTableToolbar from '@Components/Common/CompactDataTableToolbar.tsx'
import DataTable from '@Components/Common/DataTable.tsx'
import DataTableFilters from '@Components/Common/DataTableFilters.tsx'
import DataTableToolbar from '@Components/Common/DataTableToolbar.tsx'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import TruncatedText from '@Components/Common/TruncatedText.tsx'
import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from '@Components/Common/context_actions.ts'
import { Button } from '@Components/ui/button'
import { eventSchema, type Event } from '@Schemas'
import { useContextMenuStore } from '@StorageImpl'

export interface EventTableRow {
    event: Event
    eventTypeName: string
}

export type EventTableColumnId =
    | 'id'
    | 'eventTypeName'
    | 'timestamp'
    | 'instance'

export const EVENT_TABLE_QUERY_LABELS = {
    id: 'ID',
    event_type_id: 'ID типа события',
    instance_id: 'ID экземпляра',
    timestamp: 'Дата',
} satisfies Partial<Record<keyof typeof eventSchema.query, string>>

function toTimestamp(value: Date): string {
    const date = value instanceof Date ? value : new Date(String(value))
    if (Number.isNaN(date.getTime())) {
        return String(value)
    }
    return date.toLocaleString('ru-RU')
}

export function useEventTableColumns({
    onOpenInstance,
}: {
    onOpenInstance: (instanceId: number) => void
}): readonly DataTableColumnSchema<
    EventTableRow,
    typeof eventSchema,
    EventTableColumnId
>[] {
    return useMemo(
        () => [
            {
                id: 'id',
                label: 'ID',
                queryField: 'id',
                renderCell: row => `#${row.event.id}`,
                getValue: row => row.event.id,
                visibleByDefault: true,
                hideable: false,
                headerClassName: 'w-1/5',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in', 'gte', 'lte'],
                    placeholder: 'Например: 15 или 1,2,3',
                },
            },
            {
                id: 'eventTypeName',
                label: 'Тип',
                queryField: 'event_type_id',
                renderCell: row => (
                    <TruncatedText text={row.eventTypeName} maxLength={48} />
                ),
                getValue: row => row.event.event_type_id,
                visibleByDefault: true,
                headerClassName: 'w-1/4',
                cellClassName: 'overflow-hidden',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'ID типа события',
                },
            },
            {
                id: 'timestamp',
                label: 'Дата',
                queryField: 'timestamp',
                renderCell: row => toTimestamp(row.event.timestamp),
                getValue: row => row.event.timestamp,
                getSortValue: row => row.event.timestamp,
                visibleByDefault: true,
                headerClassName: 'w-1/3',
                filter: {
                    variant: 'datetime-local',
                    operators: ['exact', 'gte', 'lte', 'gt', 'lt'],
                },
            },
            {
                id: 'instance',
                label: 'Экземпляр',
                queryField: 'instance_id',
                renderCell: row => (
                    <Button
                        type='button'
                        variant='link'
                        className='h-auto p-0'
                        onClick={event => {
                            event.stopPropagation()
                            onOpenInstance(row.event.instance_id)
                        }}
                    >
                        Экземпляр #{row.event.instance_id}
                    </Button>
                ),
                getValue: row => row.event.instance_id,
                visibleByDefault: true,
                headerClassName: 'w-1/4',
                filter: {
                    variant: 'number',
                    operators: ['exact', 'in'],
                    placeholder: 'ID экземпляра',
                },
            },
        ],
        [onOpenInstance],
    )
}

interface Props {
    rows: EventTableRow[]
    state: DataTableStateResult<typeof eventSchema, EventTableColumnId>
    columns: readonly DataTableColumnSchema<
        EventTableRow,
        typeof eventSchema,
        EventTableColumnId
    >[]
    showToolbar?: boolean
    compactToolbar?: boolean
    emptyMessage?: ReactNode
    onViewRequest?: (event: Event) => void
    onAddRequest?: (event: Event) => void
    onChangeRequest?: (event: Event) => void
    onDeleteRequest?: (event: Event) => void
}

function EventsTable({
    rows,
    state,
    columns,
    showToolbar = true,
    compactToolbar = false,
    emptyMessage = 'Событий пока нет',
    onViewRequest,
    onAddRequest,
    onChangeRequest,
    onDeleteRequest,
}: Props): ReactNode {
    const { onContextMenuCall } = useContextMenuStore()

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
            {showToolbar && (
                <>
                    {compactToolbar ? (
                        <CompactDataTableToolbar
                            state={state}
                            columns={columns}
                            actions={
                                onAddRequest ? (
                                    <ToolbarActionButton
                                        type='button'
                                        variant='default'
                                        icon={<Plus />}
                                        label='Добавить'
                                        aria-label='Добавить событие'
                                        onClick={() =>
                                            onAddRequest({} as Event)
                                        }
                                    />
                                ) : null
                            }
                        />
                    ) : (
                        <>
                            <DataTableToolbar
                                state={state}
                                queryLabels={EVENT_TABLE_QUERY_LABELS}
                                searchPlaceholder='Поиск по событиям'
                                actions={
                                    onAddRequest ? (
                                        <ToolbarActionButton
                                            type='button'
                                            variant='default'
                                            icon={<Plus />}
                                            label='Добавить'
                                            aria-label='Добавить событие'
                                            onClick={() =>
                                                onAddRequest({} as Event)
                                            }
                                        />
                                    ) : null
                                }
                            />
                            <DataTableFilters state={state} columns={columns} />
                        </>
                    )}
                </>
            )}

            <DataTable
                state={state}
                columns={columns}
                rows={rows}
                processingMode='manual'
                getRowId={row => row.event.id}
                emptyMessage={emptyMessage}
                tableClassName='table-fixed'
                onRowClick={
                    onViewRequest ? row => onViewRequest(row.event) : undefined
                }
                onRowContextMenu={(event, row) =>
                    handleContextMenu(event, row.event)
                }
                onEmptyContextMenu={handleEmptyTableContextMenu}
            />
        </div>
    )
}

export default EventsTable
