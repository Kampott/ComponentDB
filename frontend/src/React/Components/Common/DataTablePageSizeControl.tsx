import { Rows3 } from 'lucide-react'
import {
    useEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react'

import type { DataTableStateResult } from '@/lib/useDataTableState.ts'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import { Input } from '@Components/ui/input'
import type { AnyEntitySchema } from '@EntityDsl/Core'

interface Props<S extends AnyEntitySchema, ColumnId extends string = string> {
    state: DataTableStateResult<S, ColumnId>
    compact?: boolean
}

function resolveInitialNumericValue<
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>(state: DataTableStateResult<S, ColumnId>): number {
    if (typeof state.pageSize === 'number' && Number.isFinite(state.pageSize)) {
        return state.pageSize
    }

    const firstNumericOption = state.pageSizeOptions.find(
        option => typeof option === 'number',
    )

    return typeof firstNumericOption === 'number' ? firstNumericOption : 10
}

function DataTablePageSizeControl<
    S extends AnyEntitySchema,
    ColumnId extends string = string,
>({ state, compact = false }: Props<S, ColumnId>): ReactNode {
    const lastNumericPageSize = useRef(resolveInitialNumericValue(state))
    const [draftValue, setDraftValue] = useState(() =>
        state.pageSize === 'all' ? '' : String(state.pageSize),
    )

    useEffect(() => {
        if (state.pageSize === 'all') {
            return
        }

        lastNumericPageSize.current = state.pageSize
        setDraftValue(String(state.pageSize))
    }, [state.pageSize])

    function commitDraftValue() {
        const normalizedValue = draftValue.trim()
        if (!normalizedValue) {
            setDraftValue(String(lastNumericPageSize.current))
            return
        }

        const parsedValue = Math.floor(Number(normalizedValue))
        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
            setDraftValue(String(lastNumericPageSize.current))
            return
        }

        lastNumericPageSize.current = parsedValue
        state.setPageSize(parsedValue)
        setDraftValue(String(parsedValue))
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key !== 'Enter') {
            return
        }

        event.preventDefault()
        commitDraftValue()
    }

    function toggleShowAll() {
        if (state.pageSize === 'all') {
            state.setPageSize(lastNumericPageSize.current)
            setDraftValue(String(lastNumericPageSize.current))
            return
        }

        state.setPageSize('all')
    }

    return (
        <div className='flex items-center gap-2'>
            <Input
                type='number'
                min={1}
                step={1}
                inputMode='numeric'
                value={state.pageSize === 'all' ? '' : draftValue}
                onChange={event => setDraftValue(event.target.value)}
                onBlur={commitDraftValue}
                onKeyDown={handleKeyDown}
                placeholder={compact ? 'Кол-во' : 'Количество'}
                className={compact ? 'h-8 w-24' : 'w-32'}
            />
            <ToolbarActionButton
                type='button'
                variant='outline'
                icon={<Rows3 />}
                label={state.pageSize === 'all' ? 'Лимит' : 'Все'}
                onClick={toggleShowAll}
            />
        </div>
    )
}

export default DataTablePageSizeControl
