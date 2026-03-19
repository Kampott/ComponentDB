interface Props {
    value: Record<string, unknown> | null | undefined
}

function renderValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '—'
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
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

function KeyValueObjectView({ value }: Props) {
    if (!value || Object.keys(value).length === 0) {
        return <span className='text-muted-foreground'>—</span>
    }

    return (
        <div className='space-y-2'>
            {Object.entries(value).map(([key, fieldValue]) => (
                <div
                    key={key}
                    className='grid grid-cols-[minmax(120px,180px)_1fr] gap-3 rounded-sm border px-3 py-2'
                >
                    <div className='font-mono text-xs break-all'>{key}</div>
                    <div className='whitespace-pre-wrap break-words text-sm'>
                        {renderValue(fieldValue)}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default KeyValueObjectView
