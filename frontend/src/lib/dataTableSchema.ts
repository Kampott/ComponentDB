import type { ReactNode } from 'react'

import type {
    AnyEntitySchema,
    EntityQueryScalar,
    EntityQueryValue,
} from '@EntityDsl/Core'

import type {
    DataTableColumn,
    DataTableFilter,
    DataTableFilterOperator,
    DataTableQueryField,
    DataTableStateResult,
} from '@/lib/useDataTableState.ts'

export type DataTableFilterVariant =
    | 'text'
    | 'number'
    | 'date'
    | 'datetime-local'
    | 'boolean'

export interface DataTableColumnFilterConfig {
    variant: DataTableFilterVariant
    operators?: readonly DataTableFilterOperator[]
    placeholder?: string
    trueLabel?: string
    falseLabel?: string
}

export interface DataTableColumnSchema<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
> extends DataTableColumn<ColumnId> {
    queryField?: DataTableQueryField<S>
    headerClassName?: string
    cellClassName?: string
    renderCell: (row: Row) => ReactNode
    getValue?: (row: Row) => EntityQueryScalar | null | undefined
    getSortValue?: (row: Row) => EntityQueryScalar | null | undefined
    filter?: DataTableColumnFilterConfig
}

export interface ResolvedDataTableRows<Row> {
    filteredRows: Row[]
    visibleRows: Row[]
    totalRows: number
    totalPages: number
}

export function parseFilterValue(
    rawValue: string,
    filter: DataTableColumnFilterConfig,
    operator: DataTableFilterOperator,
): EntityQueryValue | null {
    const normalizedValue = rawValue.trim()
    if (!normalizedValue) {
        return null
    }

    const parseSingleValue = (value: string): EntityQueryScalar | null => {
        const nextValue = value.trim()
        if (!nextValue) {
            return null
        }

        switch (filter.variant) {
            case 'number': {
                const parsed = Number(nextValue)
                return Number.isFinite(parsed) ? parsed : null
            }
            case 'date':
            case 'datetime-local': {
                const parsed = new Date(nextValue)
                return Number.isNaN(parsed.getTime()) ? null : parsed
            }
            case 'boolean':
                if (nextValue === 'true') {
                    return true
                }
                if (nextValue === 'false') {
                    return false
                }
                return null
            case 'text':
            default:
                return nextValue
        }
    }

    if (operator === 'in') {
        const parsedValues = normalizedValue
            .split(',')
            .map(value => parseSingleValue(value))
            .filter((value): value is EntityQueryScalar => value !== null)

        return parsedValues.length > 0 ? parsedValues : null
    }

    return parseSingleValue(normalizedValue)
}

export function formatFilterValue(
    value: EntityQueryValue,
    filter?: DataTableColumnFilterConfig,
): string {
    const formatSingleValue = (currentValue: EntityQueryScalar): string => {
        if (currentValue instanceof Date) {
            if (filter?.variant === 'date') {
                return currentValue.toLocaleDateString('ru-RU')
            }

            return currentValue.toLocaleString('ru-RU')
        }

        if (typeof currentValue === 'boolean') {
            if (currentValue) {
                return filter?.trueLabel ?? 'Да'
            }

            return filter?.falseLabel ?? 'Нет'
        }

        return String(currentValue)
    }

    if (Array.isArray(value)) {
        return value
            .map(currentValue => formatSingleValue(currentValue))
            .join(', ')
    }

    return formatSingleValue(value as EntityQueryScalar)
}

function normalizeScalar(value: unknown): string | number | boolean | null {
    if (value instanceof Date) {
        return value.getTime()
    }

    if (typeof value === 'string') {
        return value.toLocaleLowerCase()
    }

    if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
    ) {
        return value
    }

    return null
}

function normalizeText(value: unknown): string {
    if (value instanceof Date) {
        return value.toISOString().toLocaleLowerCase()
    }

    if (typeof value === 'string') {
        return value.toLocaleLowerCase()
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value).toLocaleLowerCase()
    }

    return ''
}

function compareScalarValues(left: unknown, right: unknown): number {
    const normalizedLeft = normalizeScalar(left)
    const normalizedRight = normalizeScalar(right)

    if (normalizedLeft === normalizedRight) {
        return 0
    }

    if (normalizedLeft === null) {
        return 1
    }

    if (normalizedRight === null) {
        return -1
    }

    if (
        typeof normalizedLeft === 'number' &&
        typeof normalizedRight === 'number'
    ) {
        return normalizedLeft - normalizedRight
    }

    if (
        typeof normalizedLeft === 'boolean' &&
        typeof normalizedRight === 'boolean'
    ) {
        return Number(normalizedLeft) - Number(normalizedRight)
    }

    return String(normalizedLeft).localeCompare(String(normalizedRight), 'ru')
}

function isArrayQueryValue(
    value: EntityQueryValue,
): value is readonly EntityQueryScalar[] {
    return Array.isArray(value)
}

function matchesExactFilter(
    candidate: unknown,
    filterValue: EntityQueryValue,
): boolean {
    return compareScalarValues(candidate, filterValue) === 0
}

function matchesLikeFilter(
    candidate: unknown,
    filterValue: EntityQueryValue,
): boolean {
    return normalizeText(candidate).includes(normalizeText(filterValue))
}

function matchesInFilter(
    candidate: unknown,
    filterValue: EntityQueryValue,
): boolean {
    if (!isArrayQueryValue(filterValue)) {
        return false
    }

    return filterValue.some(currentValue =>
        matchesExactFilter(candidate, currentValue),
    )
}

function matchesRangeFilter(
    candidate: unknown,
    filterValue: EntityQueryValue,
    operator: DataTableFilter<AnyEntitySchema>['operator'],
): boolean {
    const comparison = compareScalarValues(candidate, filterValue)

    switch (operator) {
        case 'gte':
            return comparison >= 0
        case 'lte':
            return comparison <= 0
        case 'gt':
            return comparison > 0
        case 'lt':
            return comparison < 0
        default:
            return false
    }
}

function matchesFilter(
    candidate: unknown,
    filter: DataTableFilter<AnyEntitySchema>,
): boolean {
    switch (filter.operator) {
        case 'exact':
            return matchesExactFilter(candidate, filter.value)
        case 'like':
            return matchesLikeFilter(candidate, filter.value)
        case 'in':
            return matchesInFilter(candidate, filter.value)
        case 'gte':
        case 'lte':
        case 'gt':
        case 'lt':
            return matchesRangeFilter(candidate, filter.value, filter.operator)
        default:
            return true
    }
}

function getColumnValue<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string,
>(
    row: Row,
    field: DataTableQueryField<S>,
    columns: readonly DataTableColumnSchema<Row, S, ColumnId>[],
    mode: 'value' | 'sort',
): EntityQueryScalar | null | undefined {
    const column = columns.find(
        currentColumn => currentColumn.queryField === field,
    )
    if (!column) {
        return undefined
    }

    if (mode === 'sort' && column.getSortValue) {
        return column.getSortValue(row)
    }

    return column.getValue?.(row)
}

export function resolveDataTableRows<
    Row,
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({
    rows,
    columns,
    state,
}: {
    rows: readonly Row[]
    columns: readonly DataTableColumnSchema<Row, S, ColumnId>[]
    state: DataTableStateResult<S, ColumnId>
}): ResolvedDataTableRows<Row> {
    const filteredRows = rows.filter(row => {
        if (state.searchField && state.searchValue.trim().length > 0) {
            const searchCandidate = getColumnValue(
                row,
                state.searchField,
                columns,
                'value',
            )

            if (
                !matchesFilter(searchCandidate, {
                    field: state.searchField,
                    operator: state.searchOperator,
                    value: state.searchValue.trim(),
                } as DataTableFilter<AnyEntitySchema>)
            ) {
                return false
            }
        }

        return state.filters.every(filter => {
            const candidate = getColumnValue(
                row,
                filter.field,
                columns,
                'value',
            )
            return matchesFilter(
                candidate,
                filter as DataTableFilter<AnyEntitySchema>,
            )
        })
    })

    const sortedRows = [...filteredRows]
    if (state.sorting) {
        sortedRows.sort((left, right) => {
            const leftValue = getColumnValue(
                left,
                state.sorting!.field,
                columns,
                'sort',
            )
            const rightValue = getColumnValue(
                right,
                state.sorting!.field,
                columns,
                'sort',
            )
            const comparison = compareScalarValues(leftValue, rightValue)

            return state.sorting!.direction === 'asc' ? comparison : -comparison
        })
    }

    return {
        filteredRows: sortedRows,
        visibleRows: state.paginateItems(sortedRows),
        totalRows: sortedRows.length,
        totalPages: state.getPageCount(sortedRows.length),
    }
}
