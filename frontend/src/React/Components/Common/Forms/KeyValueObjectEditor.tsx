import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@Components/ui/button'
import { Input } from '@Components/ui/input'

type KeyValueRow = {
    id: number
    key: string
    value: string
}

interface Props {
    initialValue: Record<string, unknown> | null | undefined
    onChange: (value: Record<string, unknown>) => void
    onErrorChange?: (error: string | null) => void
}

function stringifyValue(value: unknown): string {
    if (value === null || value === undefined) {
        return ''
    }
    if (typeof value === 'string') {
        return value
    }
    if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
    ) {
        return String(value)
    }

    try {
        return JSON.stringify(value)
    } catch {
        return String(value)
    }
}

function mapInitialRows(
    value: Record<string, unknown> | null | undefined,
): KeyValueRow[] {
    if (!value || Object.keys(value).length === 0) {
        return []
    }

    return Object.entries(value).map(([key, fieldValue], index) => ({
        id: index + 1,
        key,
        value: stringifyValue(fieldValue),
    }))
}

function KeyValueObjectEditor({
    initialValue,
    onChange,
    onErrorChange,
}: Props) {
    const [rows, setRows] = useState<KeyValueRow[]>(() =>
        mapInitialRows(initialValue),
    )
    const nextIdRef = useRef(rows.length + 1)
    const onChangeRef = useRef(onChange)
    const onErrorChangeRef = useRef(onErrorChange)

    useEffect(() => {
        onChangeRef.current = onChange
        onErrorChangeRef.current = onErrorChange
    }, [onChange, onErrorChange])

    useEffect(() => {
        const trimmedKeys = rows
            .map(row => row.key.trim())
            .filter(key => key.length > 0)
        const uniqueKeys = new Set(trimmedKeys)

        if (trimmedKeys.length !== uniqueKeys.size) {
            onErrorChangeRef.current?.('Ключи в словаре не должны повторяться')
            return
        }

        const hasPartiallyFilledRow = rows.some(
            row => row.key.trim().length === 0 && row.value.trim().length > 0,
        )
        if (hasPartiallyFilledRow) {
            onErrorChangeRef.current?.(
                'Заполните ключ или удалите пустую строку',
            )
            return
        }

        const normalizedValue = rows.reduce<Record<string, unknown>>(
            (accumulator, row) => {
                const key = row.key.trim()
                if (key.length === 0) {
                    return accumulator
                }

                accumulator[key] = row.value
                return accumulator
            },
            {},
        )

        onErrorChangeRef.current?.(null)
        onChangeRef.current(normalizedValue)
    }, [rows])

    function addRow() {
        setRows(prev => [
            ...prev,
            { id: nextIdRef.current++, key: '', value: '' },
        ])
    }

    function updateRow(id: number, patch: Partial<KeyValueRow>) {
        setRows(prev =>
            prev.map(row => (row.id === id ? { ...row, ...patch } : row)),
        )
    }

    function removeRow(id: number) {
        setRows(prev => prev.filter(row => row.id !== id))
    }

    return (
        <div className='space-y-3'>
            {rows.length > 0 ? (
                <div className='space-y-2'>
                    {rows.map(row => (
                        <div key={row.id} className='flex items-start gap-2'>
                            <Input
                                placeholder='Ключ'
                                value={row.key}
                                onChange={event =>
                                    updateRow(row.id, {
                                        key: event.target.value,
                                    })
                                }
                            />
                            <Input
                                placeholder='Значение'
                                value={row.value}
                                onChange={event =>
                                    updateRow(row.id, {
                                        value: event.target.value,
                                    })
                                }
                            />
                            <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                onClick={() => removeRow(row.id)}
                                aria-label='Удалить поле'
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className='text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm'>
                    Словарь пуст.
                </div>
            )}
            <Button type='button' variant='outline' onClick={addRow}>
                <Plus className='mr-2 h-4 w-4' />
                Добавить поле
            </Button>
        </div>
    )
}

export default KeyValueObjectEditor
