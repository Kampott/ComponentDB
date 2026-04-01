import { SlidersHorizontal, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import type { AnyEntitySchema } from '@EntityDsl/Core'

import type { DataTableColumnSchema } from '@/lib/dataTableSchema.ts'
import type { DataTableStateResult } from '@/lib/useDataTableState.ts'
import {
    DataTableActiveFilters,
    DataTableFiltersTrigger,
} from '@Components/Common/DataTableFilters.tsx'
import DataTablePageSizeControl from '@Components/Common/DataTablePageSizeControl.tsx'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@Components/ui/dropdown-menu'

interface Props<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
> {
    state: DataTableStateResult<S, ColumnId>
    columns: readonly DataTableColumnSchema<Row, S, ColumnId>[]
    actions?: ReactNode
    className?: string
}

function CompactDataTableToolbar<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({ state, columns, actions, className }: Props<Row, S, ColumnId>): ReactNode {
    const hideableColumns = state.columns.filter(
        column => column.hideable !== false,
    )

    return (
        <div
            className={cn(
                'flex flex-col gap-3 rounded-md border bg-muted/20 p-3',
                className,
            )}
        >
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <DataTableFiltersTrigger state={state} columns={columns} />

                <div className='flex flex-wrap items-center justify-end gap-2'>
                    <DataTablePageSizeControl state={state} compact />

                    {hideableColumns.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <ToolbarActionButton
                                    variant='outline'
                                    icon={<SlidersHorizontal />}
                                    label='Колонки'
                                />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-56'>
                                <DropdownMenuLabel>
                                    Видимость колонок
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {hideableColumns.map(column => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        checked={
                                            state.columnVisibility[
                                                column.id
                                            ] !== false
                                        }
                                        onCheckedChange={checked =>
                                            state.setColumnVisibility(
                                                column.id,
                                                Boolean(checked),
                                            )
                                        }
                                    >
                                        {column.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    <ToolbarActionButton
                        type='button'
                        variant='outline'
                        icon={<X />}
                        label='Сбросить'
                        onClick={() => state.resetState()}
                    />

                    {actions}
                </div>
            </div>

            <DataTableActiveFilters state={state} columns={columns} />
        </div>
    )
}

export default CompactDataTableToolbar
