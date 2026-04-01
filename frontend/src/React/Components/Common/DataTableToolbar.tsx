import { SlidersHorizontal, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import type { AnyEntitySchema } from '@EntityDsl/Core'

import type {
    DataTableQueryField,
    DataTableStateResult,
} from '@/lib/useDataTableState.ts'
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
import { Input } from '@Components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@Components/ui/select'

interface Props<S extends AnyEntitySchema, ColumnId extends string = string> {
    state: DataTableStateResult<S, ColumnId>
    queryLabels?: Partial<Record<DataTableQueryField<S>, string>>
    searchPlaceholder?: string
    actions?: ReactNode
    className?: string
}

function getSearchOperatorLabel(operator: 'exact' | 'like'): string {
    return operator === 'like' ? 'Содержит' : 'Равно'
}

function getFieldLabel<S extends AnyEntitySchema>(
    field: DataTableQueryField<S>,
    queryLabels?: Partial<Record<DataTableQueryField<S>, string>>,
): string {
    return queryLabels?.[field] ?? field
}

function DataTableToolbar<
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({
    state,
    queryLabels,
    searchPlaceholder = 'Поиск',
    actions,
    className,
}: Props<S, ColumnId>): ReactNode {
    const hasSearch = state.searchableFields.length > 0
    const searchOperators = state.searchField
        ? state
              .getAllowedOperators(state.searchField)
              .filter(operator => operator === 'exact' || operator === 'like')
        : []

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
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <div className='flex flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-center'>
                    {hasSearch && (
                        <>
                            {state.searchableFields.length > 1 && (
                                <Select
                                    value={state.searchField ?? undefined}
                                    onValueChange={value =>
                                        state.setSearchField(
                                            value as DataTableQueryField<S>,
                                        )
                                    }
                                >
                                    <SelectTrigger className='w-full md:w-52'>
                                        <SelectValue placeholder='Поле поиска' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {state.searchableFields.map(field => (
                                            <SelectItem
                                                key={field}
                                                value={field}
                                            >
                                                {getFieldLabel(
                                                    field,
                                                    queryLabels,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {searchOperators.length > 1 && (
                                <Select
                                    value={state.searchOperator}
                                    onValueChange={value =>
                                        state.setSearchOperator(
                                            value as 'exact' | 'like',
                                        )
                                    }
                                >
                                    <SelectTrigger className='w-full md:w-40'>
                                        <SelectValue placeholder='Оператор' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {searchOperators.map(operator => (
                                            <SelectItem
                                                key={operator}
                                                value={operator}
                                            >
                                                {getSearchOperatorLabel(
                                                    operator,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Input
                                value={state.searchValue}
                                onChange={event =>
                                    state.setSearchValue(event.target.value)
                                }
                                placeholder={
                                    state.searchField
                                        ? `${searchPlaceholder}: ${getFieldLabel(
                                              state.searchField,
                                              queryLabels,
                                          )}`
                                        : searchPlaceholder
                                }
                                className='w-full md:min-w-72 md:flex-1'
                                disabled={!state.searchField}
                            />
                        </>
                    )}
                </div>

                <div className='flex flex-wrap items-center justify-end gap-2'>
                    <DataTablePageSizeControl state={state} />

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
        </div>
    )
}

export default DataTableToolbar
