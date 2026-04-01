import { Filter, Plus, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import type { AnyEntitySchema } from '@EntityDsl/Core'

import {
    formatFilterValue,
    parseFilterValue,
    type DataTableColumnFilterConfig,
    type DataTableColumnSchema,
} from '@/lib/dataTableSchema.ts'
import type {
    DataTableFilterOperator,
    DataTableQueryField,
    DataTableStateResult,
} from '@/lib/useDataTableState.ts'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import { Button } from '@Components/ui/button'
import { Input } from '@Components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@Components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@Components/ui/select'

interface Props<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
> {
    state: DataTableStateResult<S, ColumnId>
    columns: readonly DataTableColumnSchema<Row, S, ColumnId>[]
    className?: string
}

function getOperatorLabel(operator: DataTableFilterOperator): string {
    switch (operator) {
        case 'exact':
            return 'Равно'
        case 'like':
            return 'Содержит'
        case 'in':
            return 'В списке'
        case 'gte':
            return '>='
        case 'lte':
            return '<='
        case 'gt':
            return '>'
        case 'lt':
            return '<'
        default:
            return operator
    }
}

function getDefaultOperator(
    allowedOperators: readonly DataTableFilterOperator[],
): DataTableFilterOperator {
    return allowedOperators[0] ?? 'exact'
}

function normalizeDraftOperator(
    currentOperator: DataTableFilterOperator,
    allowedOperators: readonly DataTableFilterOperator[],
): DataTableFilterOperator {
    if (allowedOperators.includes(currentOperator)) {
        return currentOperator
    }

    return getDefaultOperator(allowedOperators)
}

function getInputPlaceholder(
    filter: DataTableColumnFilterConfig,
    operator: DataTableFilterOperator,
): string {
    if (filter.placeholder) {
        return filter.placeholder
    }

    if (operator === 'in') {
        return 'Значения через запятую'
    }

    switch (filter.variant) {
        case 'number':
            return 'Введите число'
        case 'date':
            return 'Выберите дату'
        case 'datetime-local':
            return 'Выберите дату и время'
        case 'boolean':
            return 'Выберите значение'
        case 'text':
        default:
            return 'Введите значение'
    }
}

function resolveFilterableColumns<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>(
    columns: readonly DataTableColumnSchema<Row, S, ColumnId>[],
    state: DataTableStateResult<S, ColumnId>,
) {
    return columns.filter(
        (
            column,
        ): column is DataTableColumnSchema<Row, S, ColumnId> & {
            queryField: DataTableQueryField<S>
            filter: DataTableColumnFilterConfig
        } =>
            column.queryField !== undefined &&
            column.filter !== undefined &&
            state
                .getAllowedOperators(column.queryField)
                .some(operator => operator !== 'sort'),
    )
}

export function DataTableFiltersTrigger<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({ state, columns, className }: Props<Row, S, ColumnId>): ReactNode {
    const filterableColumns = useMemo(
        () => resolveFilterableColumns(columns, state),
        [columns, state],
    )

    const [selectedField, setSelectedField] =
        useState<DataTableQueryField<S> | null>(
            filterableColumns[0]?.queryField ?? null,
        )
    const selectedColumn =
        filterableColumns.find(column => column.queryField === selectedField) ??
        filterableColumns[0]

    const allowedOperators = useMemo(() => {
        if (!selectedColumn) {
            return [] as DataTableFilterOperator[]
        }

        const schemaOperators = state
            .getAllowedOperators(selectedColumn.queryField)
            .filter(
                (operator): operator is DataTableFilterOperator =>
                    operator !== 'sort',
            )

        if (!selectedColumn.filter.operators?.length) {
            return schemaOperators
        }

        return schemaOperators.filter(operator =>
            selectedColumn.filter!.operators!.includes(operator),
        )
    }, [selectedColumn, state])

    const [selectedOperator, setSelectedOperator] =
        useState<DataTableFilterOperator>(getDefaultOperator(allowedOperators))
    const [rawValue, setRawValue] = useState('')

    const normalizedOperator = normalizeDraftOperator(
        selectedOperator,
        allowedOperators,
    )

    function handleFieldChange(value: string) {
        const nextField = value as DataTableQueryField<S>
        const nextColumn = filterableColumns.find(
            column => column.queryField === nextField,
        )

        setSelectedField(nextField)
        setRawValue('')

        if (!nextColumn) {
            return
        }

        const nextAllowedOperators = state
            .getAllowedOperators(nextField)
            .filter(
                (operator): operator is DataTableFilterOperator =>
                    operator !== 'sort',
            )
            .filter(operator =>
                nextColumn.filter.operators?.length
                    ? nextColumn.filter.operators.includes(operator)
                    : true,
            )

        setSelectedOperator(getDefaultOperator(nextAllowedOperators))
    }

    function handleAddFilter() {
        if (!selectedColumn) {
            return
        }

        const parsedValue = parseFilterValue(
            rawValue,
            selectedColumn.filter,
            normalizedOperator,
        )

        if (parsedValue === null) {
            return
        }

        state.upsertFilter({
            field: selectedColumn.queryField,
            operator: normalizedOperator,
            value: parsedValue,
        })
        setRawValue('')
    }

    if (filterableColumns.length === 0) {
        return null
    }

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <ToolbarActionButton
                        type='button'
                        variant='outline'
                        icon={<Filter />}
                        label='Фильтры'
                    />
                </PopoverTrigger>
                <PopoverContent align='end' className='w-96 space-y-3'>
                    <div className='space-y-1'>
                        <h3 className='text-sm font-medium'>Добавить фильтр</h3>
                        <p className='text-muted-foreground text-xs'>
                            Поля и операторы берутся из схемы сущности.
                        </p>
                    </div>

                    <Select
                        value={selectedColumn?.queryField}
                        onValueChange={handleFieldChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder='Поле фильтра' />
                        </SelectTrigger>
                        <SelectContent>
                            {filterableColumns.map(column => (
                                <SelectItem
                                    key={column.id}
                                    value={column.queryField}
                                >
                                    {column.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={normalizedOperator}
                        onValueChange={value =>
                            setSelectedOperator(
                                value as DataTableFilterOperator,
                            )
                        }
                        disabled={allowedOperators.length === 0}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder='Оператор' />
                        </SelectTrigger>
                        <SelectContent>
                            {allowedOperators.map(operator => (
                                <SelectItem key={operator} value={operator}>
                                    {getOperatorLabel(operator)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedColumn?.filter.variant === 'boolean' ? (
                        <Select
                            value={rawValue}
                            onValueChange={value => setRawValue(value)}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={getInputPlaceholder(
                                        selectedColumn.filter,
                                        normalizedOperator,
                                    )}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='true'>
                                    {selectedColumn.filter.trueLabel ?? 'Да'}
                                </SelectItem>
                                <SelectItem value='false'>
                                    {selectedColumn.filter.falseLabel ?? 'Нет'}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            type={
                                selectedColumn?.filter.variant === 'number'
                                    ? 'number'
                                    : selectedColumn?.filter.variant === 'date'
                                      ? 'date'
                                      : selectedColumn?.filter.variant ===
                                          'datetime-local'
                                        ? 'datetime-local'
                                        : 'text'
                            }
                            value={rawValue}
                            onChange={event => setRawValue(event.target.value)}
                            placeholder={
                                selectedColumn
                                    ? getInputPlaceholder(
                                          selectedColumn.filter,
                                          normalizedOperator,
                                      )
                                    : 'Введите значение'
                            }
                        />
                    )}

                    <Button
                        type='button'
                        className='w-full'
                        onClick={handleAddFilter}
                        disabled={!selectedColumn || !rawValue.trim()}
                    >
                        <Plus />
                        Добавить фильтр
                    </Button>
                </PopoverContent>
            </Popover>

            {state.filters.length > 0 && (
                <ToolbarActionButton
                    type='button'
                    variant='ghost'
                    icon={<X />}
                    label='Очистить'
                    onClick={() => state.clearFilters()}
                />
            )}
        </div>
    )
}

export function DataTableActiveFilters<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({ state, columns, className }: Props<Row, S, ColumnId>): ReactNode {
    const filterableColumns = useMemo(
        () => resolveFilterableColumns(columns, state),
        [columns, state],
    )

    if (state.filters.length === 0) {
        return null
    }

    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {state.filters.map(filter => {
                const column = filterableColumns.find(
                    currentColumn => currentColumn.queryField === filter.field,
                )

                return (
                    <div
                        key={`${filter.field}-${filter.operator}`}
                        className='bg-muted inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm'
                    >
                        <span className='font-medium'>
                            {column?.label ?? filter.field}
                        </span>
                        <span className='text-muted-foreground'>
                            {getOperatorLabel(filter.operator)}
                        </span>
                        <span>
                            {formatFilterValue(filter.value, column?.filter)}
                        </span>
                        <button
                            type='button'
                            className='text-muted-foreground hover:text-foreground'
                            onClick={() =>
                                state.removeFilter(
                                    filter.field,
                                    filter.operator,
                                )
                            }
                        >
                            <X className='size-3.5' />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

function DataTableFilters<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({ state, columns, className }: Props<Row, S, ColumnId>): ReactNode {
    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <DataTableFiltersTrigger state={state} columns={columns} />
            <DataTableActiveFilters state={state} columns={columns} />
        </div>
    )
}

export default DataTableFilters
