import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useEffect, useMemo, type MouseEvent, type ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import type { AnyEntitySchema } from '@EntityDsl/Core'

import {
    resolveDataTableRows,
    type DataTableColumnSchema,
} from '@/lib/dataTableSchema.ts'
import type { DataTableStateResult } from '@/lib/useDataTableState.ts'
import PaginationControls from '@Components/Common/PaginationControls.tsx'
import { Button } from '@Components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@Components/ui/table'

interface Props<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
> {
    state: DataTableStateResult<S, ColumnId>
    columns: readonly DataTableColumnSchema<Row, S, ColumnId>[]
    rows: readonly Row[]
    getRowId: (row: Row) => string | number
    processingMode?: 'client' | 'manual'
    emptyMessage?: ReactNode
    className?: string
    tableClassName?: string
    rowClassName?: string | ((row: Row) => string | undefined)
    onRowClick?: (row: Row) => void
    onRowContextMenu?: (event: MouseEvent<HTMLElement>, row: Row) => void
    onEmptyContextMenu?: (event: MouseEvent<HTMLElement>) => void
}

function getSortingIcon(direction: 'asc' | 'desc' | null): ReactNode {
    if (direction === 'asc') {
        return <ArrowUp className='size-4' />
    }

    if (direction === 'desc') {
        return <ArrowDown className='size-4' />
    }

    return <ArrowUpDown className='size-4 opacity-60' />
}

function DataTable<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({
    state,
    columns,
    rows,
    getRowId,
    processingMode = 'client',
    emptyMessage = 'Данных пока нет',
    className,
    tableClassName,
    rowClassName,
    onRowClick,
    onRowContextMenu,
    onEmptyContextMenu,
}: Props<Row, S, ColumnId>): ReactNode {
    const columnsById = useMemo(
        () => new Map(columns.map(column => [column.id, column])),
        [columns],
    )

    const visibleColumns = useMemo(
        () =>
            state.visibleColumns
                .map(column => columnsById.get(column.id))
                .filter(
                    (
                        column,
                    ): column is DataTableColumnSchema<Row, S, ColumnId> =>
                        column !== undefined,
                ),
        [columnsById, state.visibleColumns],
    )

    const { totalPages, totalRows, visibleRows } = useMemo(() => {
        if (processingMode === 'manual') {
            return {
                filteredRows: [...rows],
                visibleRows: state.paginateItems(rows),
                totalRows: rows.length,
                totalPages: state.getPageCount(rows.length),
            }
        }

        return resolveDataTableRows({
            rows,
            columns,
            state,
        })
    }, [columns, processingMode, rows, state])

    useEffect(() => {
        if (state.page > totalPages) {
            state.setPage(totalPages)
        }
    }, [state, totalPages])

    if (visibleColumns.length === 0) {
        return (
            <div className={cn('rounded-md border p-6 text-center', className)}>
                <span className='text-muted-foreground text-sm'>
                    Нет видимых колонок. Включи хотя бы одну в настройках
                    таблицы.
                </span>
            </div>
        )
    }

    return (
        <div className={cn('space-y-4', className)}>
            <div
                className='overflow-hidden rounded-md border'
                onContextMenu={
                    visibleRows.length === 0 ? onEmptyContextMenu : undefined
                }
            >
                <Table className={tableClassName}>
                    <TableHeader>
                        <TableRow>
                            {visibleColumns.map(column => {
                                const sortingField =
                                    state.sorting?.field ?? null
                                const sortingDirection =
                                    state.sorting?.direction ?? null
                                const isSortable =
                                    column.queryField &&
                                    state.supportsOperator(
                                        column.queryField,
                                        'sort',
                                    )
                                const activeSortingDirection =
                                    sortingField === column.queryField
                                        ? sortingDirection
                                        : null

                                return (
                                    <TableHead
                                        key={column.id}
                                        className={column.headerClassName}
                                    >
                                        {isSortable && column.queryField ? (
                                            <Button
                                                type='button'
                                                variant='ghost'
                                                size='sm'
                                                className='-ml-2 h-8 px-2'
                                                onClick={() =>
                                                    state.toggleSorting(
                                                        column.queryField!,
                                                    )
                                                }
                                            >
                                                <span>{column.label}</span>
                                                {getSortingIcon(
                                                    activeSortingDirection,
                                                )}
                                            </Button>
                                        ) : (
                                            column.label
                                        )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleRows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={visibleColumns.length}
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
                                    key={getRowId(row)}
                                    className={cn(
                                        onRowClick
                                            ? 'cursor-pointer'
                                            : undefined,
                                        typeof rowClassName === 'function'
                                            ? rowClassName(row)
                                            : rowClassName,
                                    )}
                                    onClick={() => onRowClick?.(row)}
                                    onContextMenu={event =>
                                        onRowContextMenu?.(event, row)
                                    }
                                >
                                    {visibleColumns.map(column => (
                                        <TableCell
                                            key={column.id}
                                            className={column.cellClassName}
                                        >
                                            {column.renderCell(row)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <span className='text-muted-foreground text-sm'>
                    Показано {visibleRows.length} из {totalRows}
                </span>
                <PaginationControls
                    page={state.page}
                    totalPages={totalPages}
                    onPageChange={state.setPage}
                />
            </div>
        </div>
    )
}

export default DataTable
