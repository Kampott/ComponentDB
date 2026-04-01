import {
    useEffect,
    useMemo,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react'

import type {
    AnyEntitySchema,
    EntityQueryOperator,
    EntityQueryParams,
    EntityQueryScalar,
    EntityQuerySortDirection,
    EntityQueryValue,
    InferListQuery,
} from '@EntityDsl/Core'

export type DataTablePageSize = number | 'all'

export type DataTableQueryField<S extends AnyEntitySchema> = keyof S['query'] &
    string

export type DataTableFilterOperator = Exclude<EntityQueryOperator, 'sort'>
export type DataTableSearchOperator = Extract<
    EntityQueryOperator,
    'exact' | 'like'
>

export interface DataTableColumn<ColumnId extends string = string> {
    id: ColumnId
    label: string
    hideable?: boolean
    visibleByDefault?: boolean
}

export interface DataTableSorting<S extends AnyEntitySchema> {
    field: DataTableQueryField<S>
    direction: EntityQuerySortDirection
}

export interface DataTableFilter<S extends AnyEntitySchema> {
    field: DataTableQueryField<S>
    operator: DataTableFilterOperator
    value: EntityQueryValue
}

export interface DataTableStateOptions<
    S extends AnyEntitySchema,
    ColumnId extends string = string,
> {
    schema: S
    columns: readonly DataTableColumn<ColumnId>[]
    defaultPageSize?: DataTablePageSize
    pageSizeOptions?: readonly DataTablePageSize[]
    defaultSorting?: DataTableSorting<S> | null
    searchableFields?: readonly DataTableQueryField<S>[]
    defaultSearchField?: DataTableQueryField<S>
    defaultSearchOperator?: DataTableSearchOperator
    initialFilters?: readonly DataTableFilter<S>[]
    initialColumnVisibility?: Partial<Record<ColumnId, boolean>>
}

export interface DataTableStateResult<
    S extends AnyEntitySchema,
    ColumnId extends string = string,
> {
    columns: readonly DataTableColumn<ColumnId>[]
    visibleColumns: DataTableColumn<ColumnId>[]
    hiddenColumns: DataTableColumn<ColumnId>[]
    columnVisibility: Record<ColumnId, boolean>
    setColumnVisibility: (columnId: ColumnId, visible: boolean) => void
    toggleColumnVisibility: (columnId: ColumnId) => void
    resetColumnVisibility: () => void

    page: number
    setPage: Dispatch<SetStateAction<number>>
    pageSize: DataTablePageSize
    isShowingAll: boolean
    setPageSize: (nextPageSize: DataTablePageSize) => void
    pageSizeOptions: readonly DataTablePageSize[]
    getPageCount: (totalItems: number) => number
    paginateItems: <T>(items: readonly T[]) => T[]

    sorting: DataTableSorting<S> | null
    setSorting: Dispatch<SetStateAction<DataTableSorting<S> | null>>
    toggleSorting: (field: DataTableQueryField<S>) => void
    clearSorting: () => void

    availableQueryFields: DataTableQueryField<S>[]
    searchableFields: DataTableQueryField<S>[]
    searchField: DataTableQueryField<S> | null
    setSearchField: (nextField: DataTableQueryField<S> | null) => void
    searchOperator: DataTableSearchOperator
    setSearchOperator: (nextOperator: DataTableSearchOperator) => void
    searchValue: string
    setSearchValue: Dispatch<SetStateAction<string>>
    clearSearch: () => void

    filters: DataTableFilter<S>[]
    setFilters: Dispatch<SetStateAction<DataTableFilter<S>[]>>
    upsertFilter: (nextFilter: DataTableFilter<S>) => void
    removeFilter: (
        field: DataTableQueryField<S>,
        operator?: DataTableFilterOperator,
    ) => void
    clearFilters: () => void

    query: InferListQuery<S>
    resetState: () => void
    getAllowedOperators: (
        field: DataTableQueryField<S>,
    ) => readonly EntityQueryOperator[]
    supportsOperator: (
        field: DataTableQueryField<S>,
        operator: EntityQueryOperator,
    ) => boolean
}

function isPositivePageSize(value: DataTablePageSize): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getAllowedOperators<S extends AnyEntitySchema>(
    schema: S,
    field: DataTableQueryField<S>,
): readonly EntityQueryOperator[] {
    return schema.query[field] ?? []
}

function supportsOperator<S extends AnyEntitySchema>(
    schema: S,
    field: DataTableQueryField<S>,
    operator: EntityQueryOperator,
): boolean {
    return getAllowedOperators(schema, field).includes(operator)
}

function normalizeSearchOperator<S extends AnyEntitySchema>(
    schema: S,
    field: DataTableQueryField<S> | null,
    operator: DataTableSearchOperator,
): DataTableSearchOperator {
    if (!field) {
        return operator
    }

    if (supportsOperator(schema, field, operator)) {
        return operator
    }

    if (supportsOperator(schema, field, 'like')) {
        return 'like'
    }

    return 'exact'
}

function normalizeSorting<S extends AnyEntitySchema>(
    schema: S,
    sorting: DataTableSorting<S> | null | undefined,
): DataTableSorting<S> | null {
    if (!sorting) {
        return null
    }

    if (!supportsOperator(schema, sorting.field, 'sort')) {
        return null
    }

    return sorting
}

function normalizeFilters<S extends AnyEntitySchema>(
    schema: S,
    filters: readonly DataTableFilter<S>[],
): DataTableFilter<S>[] {
    return filters.filter(filter =>
        supportsOperator(schema, filter.field, filter.operator),
    )
}

function buildInitialColumnVisibility<ColumnId extends string>(
    columns: readonly DataTableColumn<ColumnId>[],
    initialVisibility?: Partial<Record<ColumnId, boolean>>,
): Record<ColumnId, boolean> {
    const result = {} as Record<ColumnId, boolean>

    for (const column of columns) {
        result[column.id] =
            initialVisibility?.[column.id] ?? column.visibleByDefault !== false
    }

    return result
}

function normalizePageSize(
    pageSize: DataTablePageSize | undefined,
): DataTablePageSize {
    if (pageSize === 'all') {
        return 'all'
    }

    return isPositivePageSize(pageSize ?? 10) ? (pageSize ?? 10) : 10
}

function normalizeInFilterValue(value: EntityQueryValue): EntityQueryValue {
    if (Array.isArray(value)) {
        return value as EntityQueryScalar[] | readonly EntityQueryScalar[]
    }

    return [
        value as Exclude<
            EntityQueryValue,
            EntityQueryScalar[] | readonly EntityQueryScalar[]
        >,
    ]
}

export function useDataTableState<
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({
    schema,
    columns,
    defaultPageSize = 10,
    pageSizeOptions = [10, 20, 50, 'all'],
    defaultSorting = null,
    searchableFields,
    defaultSearchField,
    defaultSearchOperator = 'like',
    initialFilters = [],
    initialColumnVisibility,
}: DataTableStateOptions<S, ColumnId>): DataTableStateResult<S, ColumnId> {
    const availableQueryFields = useMemo(
        () => Object.keys(schema.query) as DataTableQueryField<S>[],
        [schema],
    )

    const resolvedSearchableFields = useMemo(() => {
        if (searchableFields && searchableFields.length > 0) {
            return searchableFields.filter(field =>
                supportsOperator(schema, field, 'like'),
            )
        }

        return availableQueryFields.filter(field =>
            supportsOperator(schema, field, 'like'),
        )
    }, [availableQueryFields, schema, searchableFields])

    const initialSearchField =
        defaultSearchField &&
        resolvedSearchableFields.includes(defaultSearchField)
            ? defaultSearchField
            : (resolvedSearchableFields[0] ?? null)

    const [page, setPage] = useState(1)
    const [pageSize, setPageSizeState] = useState<DataTablePageSize>(
        normalizePageSize(defaultPageSize),
    )
    const [sorting, setSorting] = useState<DataTableSorting<S> | null>(
        normalizeSorting(schema, defaultSorting),
    )
    const [searchField, setSearchFieldState] =
        useState<DataTableQueryField<S> | null>(initialSearchField)
    const [searchOperator, setSearchOperatorState] =
        useState<DataTableSearchOperator>(
            normalizeSearchOperator(
                schema,
                initialSearchField,
                defaultSearchOperator,
            ),
        )
    const [searchValue, setSearchValue] = useState('')
    const [filters, setFilters] = useState<DataTableFilter<S>[]>(
        normalizeFilters(schema, initialFilters),
    )
    const [columnVisibility, setColumnVisibilityState] = useState<
        Record<ColumnId, boolean>
    >(buildInitialColumnVisibility(columns, initialColumnVisibility))

    useEffect(() => {
        setPage(1)
    }, [pageSize, searchField, searchOperator, searchValue, filters, sorting])

    const visibleColumns = useMemo(
        () => columns.filter(column => columnVisibility[column.id] !== false),
        [columnVisibility, columns],
    )

    const hiddenColumns = useMemo(
        () => columns.filter(column => columnVisibility[column.id] === false),
        [columnVisibility, columns],
    )

    const query = useMemo(() => {
        const nextQuery: EntityQueryParams = {}

        for (const filter of filters) {
            const key =
                filter.operator === 'exact'
                    ? filter.field
                    : (`${filter.field}__${filter.operator}` as string)

            nextQuery[key] =
                filter.operator === 'in'
                    ? normalizeInFilterValue(filter.value)
                    : filter.value
        }

        const normalizedSearchValue = searchValue.trim()
        if (searchField && normalizedSearchValue.length > 0) {
            const key =
                searchOperator === 'exact'
                    ? searchField
                    : (`${searchField}__${searchOperator}` as string)
            nextQuery[key] = normalizedSearchValue
        }

        if (sorting) {
            nextQuery[`${sorting.field}__sort`] = sorting.direction
        }

        return nextQuery as InferListQuery<S>
    }, [filters, searchField, searchOperator, searchValue, sorting])

    function setPageSize(nextPageSize: DataTablePageSize) {
        setPageSizeState(normalizePageSize(nextPageSize))
    }

    function getPageCount(totalItems: number): number {
        if (pageSize === 'all') {
            return 1
        }

        return Math.max(1, Math.ceil(totalItems / pageSize))
    }

    function paginateItems<T>(items: readonly T[]): T[] {
        if (pageSize === 'all') {
            return [...items]
        }

        const from = (page - 1) * pageSize
        return items.slice(from, from + pageSize)
    }

    function setSearchField(nextField: DataTableQueryField<S> | null) {
        if (nextField === null) {
            setSearchFieldState(null)
            return
        }

        if (!resolvedSearchableFields.includes(nextField)) {
            return
        }

        setSearchFieldState(nextField)
        setSearchOperatorState(currentOperator =>
            normalizeSearchOperator(schema, nextField, currentOperator),
        )
    }

    function setSearchOperator(nextOperator: DataTableSearchOperator) {
        if (!searchField) {
            return
        }

        setSearchOperatorState(
            normalizeSearchOperator(schema, searchField, nextOperator),
        )
    }

    function clearSearch() {
        setSearchValue('')
    }

    function setColumnVisibility(columnId: ColumnId, visible: boolean) {
        setColumnVisibilityState(previous => ({
            ...previous,
            [columnId]: visible,
        }))
    }

    function toggleColumnVisibility(columnId: ColumnId) {
        const column = columns.find(
            currentColumn => currentColumn.id === columnId,
        )
        if (column?.hideable === false) {
            return
        }

        setColumnVisibilityState(previous => ({
            ...previous,
            [columnId]: previous[columnId] === false,
        }))
    }

    function resetColumnVisibility() {
        setColumnVisibilityState(
            buildInitialColumnVisibility(columns, initialColumnVisibility),
        )
    }

    function clearSorting() {
        setSorting(null)
    }

    function toggleSorting(field: DataTableQueryField<S>) {
        if (!supportsOperator(schema, field, 'sort')) {
            return
        }

        setSorting(previous => {
            if (!previous || previous.field !== field) {
                return {
                    field,
                    direction: 'asc',
                }
            }

            if (previous.direction === 'asc') {
                return {
                    field,
                    direction: 'desc',
                }
            }

            return null
        })
    }

    function upsertFilter(nextFilter: DataTableFilter<S>) {
        if (!supportsOperator(schema, nextFilter.field, nextFilter.operator)) {
            return
        }

        setFilters(previous => {
            const nextFilters = previous.filter(
                filter =>
                    !(
                        filter.field === nextFilter.field &&
                        filter.operator === nextFilter.operator
                    ),
            )

            return [...nextFilters, nextFilter]
        })
    }

    function removeFilter(
        field: DataTableQueryField<S>,
        operator?: DataTableFilterOperator,
    ) {
        setFilters(previous =>
            previous.filter(filter => {
                if (filter.field !== field) {
                    return true
                }

                if (operator === undefined) {
                    return false
                }

                return filter.operator !== operator
            }),
        )
    }

    function clearFilters() {
        setFilters([])
    }

    function resetState() {
        setPage(1)
        setPageSizeState(normalizePageSize(defaultPageSize))
        setSorting(normalizeSorting(schema, defaultSorting))
        setSearchFieldState(initialSearchField)
        setSearchOperatorState(
            normalizeSearchOperator(
                schema,
                initialSearchField,
                defaultSearchOperator,
            ),
        )
        setSearchValue('')
        setFilters(normalizeFilters(schema, initialFilters))
        setColumnVisibilityState(
            buildInitialColumnVisibility(columns, initialColumnVisibility),
        )
    }

    return {
        columns,
        visibleColumns,
        hiddenColumns,
        columnVisibility,
        setColumnVisibility,
        toggleColumnVisibility,
        resetColumnVisibility,

        page,
        setPage,
        pageSize,
        isShowingAll: pageSize === 'all',
        setPageSize,
        pageSizeOptions,
        getPageCount,
        paginateItems,

        sorting,
        setSorting,
        toggleSorting,
        clearSorting,

        availableQueryFields,
        searchableFields: resolvedSearchableFields,
        searchField,
        setSearchField,
        searchOperator,
        setSearchOperator,
        searchValue,
        setSearchValue,
        clearSearch,

        filters,
        setFilters,
        upsertFilter,
        removeFilter,
        clearFilters,

        query,
        resetState,
        getAllowedOperators: (field: DataTableQueryField<S>) =>
            getAllowedOperators(schema, field),
        supportsOperator: (
            field: DataTableQueryField<S>,
            operator: EntityQueryOperator,
        ) => supportsOperator(schema, field, operator),
    }
}

export const useDataTablesState = useDataTableState
