import { Check, ChevronDown, Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils.ts'
import { Button } from '@Components/ui/button'
import { Input } from '@Components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@Components/ui/popover'

export interface SearchableSelectOption {
    label: string
    value: string
}

interface Props {
    value?: string
    options: SearchableSelectOption[]
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    onValueChange: (value: string) => void
}

function SearchableSelect({
    value,
    options,
    placeholder = 'Выберите значение',
    searchPlaceholder = 'Поиск...',
    emptyMessage = 'Ничего не найдено',
    onValueChange,
}: Props): ReactNode {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')

    const selectedOption = useMemo(
        () => options.find(option => option.value === value),
        [options, value],
    )

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase()
        if (!normalizedQuery) {
            return options
        }

        return options.filter(option =>
            option.label.toLowerCase().includes(normalizedQuery),
        )
    }, [options, query])

    return (
        <Popover
            open={open}
            onOpenChange={nextOpen => {
                setOpen(nextOpen)
                if (!nextOpen) {
                    setQuery('')
                }
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant='outline'
                    className='w-full justify-between font-normal'
                >
                    <span className='truncate'>
                        {selectedOption?.label ??
                            (value ? `#${value}` : placeholder)}
                    </span>
                    <ChevronDown className='size-4 opacity-50' />
                </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0'>
                <div className='border-b p-3'>
                    <div className='relative'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                        <Input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder={searchPlaceholder}
                            className='pl-9'
                        />
                    </div>
                </div>
                <div className='max-h-64 overflow-y-auto p-1'>
                    {filteredOptions.length === 0 ? (
                        <div className='text-muted-foreground px-3 py-6 text-center text-sm'>
                            {emptyMessage}
                        </div>
                    ) : (
                        filteredOptions.map(option => {
                            const isSelected = option.value === value

                            return (
                                <button
                                    type='button'
                                    key={option.value}
                                    className={cn(
                                        'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm',
                                        isSelected && 'bg-accent/60',
                                    )}
                                    onClick={() => {
                                        onValueChange(option.value)
                                        setOpen(false)
                                        setQuery('')
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'size-4',
                                            isSelected
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className='truncate'>
                                        {option.label}
                                    </span>
                                </button>
                            )
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default SearchableSelect
