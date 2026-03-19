import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronDownIcon } from 'lucide-react'
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

import KeyValueObjectEditor from '@Components/Common/Forms/KeyValueObjectEditor.tsx'
import { Button } from '@Components/ui/button'
import { Calendar } from '@Components/ui/calendar'
import { Checkbox } from '@Components/ui/checkbox'
import { Input } from '@Components/ui/input'
import { Label } from '@Components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@Components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@Components/ui/select'
import type { FieldType, FormField } from '@Kernel/Forms/FormTypes.ts'

interface Props<T> {
    data: T
    setData: Dispatch<SetStateAction<T>>
    errors: Partial<Record<keyof T, string | null>>
    setErrors: Dispatch<SetStateAction<Partial<Record<keyof T, string | null>>>>
    fields: FormField<T, keyof T>[]
}

function normalizeDateValue(value: unknown): Date | undefined {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed
        }
    }

    return undefined
}

function formatTimeValue(value: Date | undefined): string {
    if (!value) {
        return '00:00:00'
    }

    const hh = String(value.getHours()).padStart(2, '0')
    const mm = String(value.getMinutes()).padStart(2, '0')
    const ss = String(value.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
}

function DefaultFormBase<T>({
    data,
    setData,
    errors,
    setErrors,
    fields,
}: Props<T>) {
    const [openDatePickers, setOpenDatePickers] = useState<
        Partial<Record<keyof T, boolean>>
    >({})

    function updateField<K extends keyof T>(field: K, value: T[K]) {
        setData((prev: T) => ({ ...prev, [field]: value }))
    }

    function getField<K extends keyof T>(field: K): T[K] {
        return data[field]
    }

    function handleChange<K extends keyof T>(
        field: FormField<T, K>,
        rawValue: unknown,
    ) {
        // parser имеет приоритет: поля, завязанные на схему (особенно select),
        // могут преобразовать сырое DOM-значение в точно типизированное
        const value = field.parser
            ? field.parser(rawValue)
            : parseValue<T, K>(rawValue, field.type)
        updateField(field.bindData, value)

        if (field.validator) {
            const validationResult = field.validator(value)
            setErrors(prev => ({ ...prev, [field.bindData]: validationResult }))
        } else {
            setErrors(prev => ({ ...prev, [field.bindData]: null }))
        }
    }

    useEffect(() => {
        for (const field of fields) {
            if (
                field.type == 'select' &&
                field.options &&
                field.options.length > 0
            ) {
                // Инициализируем select-поля первым значением,
                // чтобы не отправлять undefined, если пользователь не трогал контрол
                handleChange(field, field.options[0].value)
            }
        }
    }, [])

    function parseValue<T, K extends keyof T>(
        value: unknown,
        type: FieldType,
    ): T[K] {
        switch (type) {
            case 'number':
                return Number(value) as T[K]
            case 'boolean':
                if (typeof value === 'string') {
                    return (value === 'true') as T[K]
                }
                return Boolean(value) as T[K]
            case 'datetime':
                if (value instanceof Date) {
                    return value as T[K]
                }
                return new Date(String(value)) as T[K]
            default:
                return value as T[K]
        }
    }

    return (
        <>
            {fields.map((field: FormField<T, keyof T>) => {
                return (
                    <div key={String(field.bindData)} className='mb-3'>
                        <Label className='mb-2'>{field.label}</Label>
                        {field.type === 'select' && field.options ? (
                            <Select
                                value={String(getField(field.bindData) ?? '')}
                                onValueChange={value =>
                                    handleChange(field, value)
                                }
                            >
                                <SelectTrigger
                                    aria-invalid={!!errors[field.bindData]}
                                >
                                    <SelectValue
                                        placeholder={
                                            field.placeholder ??
                                            'Выберите значение'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {field.options.map(opt => (
                                        <SelectItem
                                            key={String(opt.value)}
                                            value={String(opt.value)}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : field.type === 'boolean' ? (
                            <div className='flex items-center gap-2 pt-1'>
                                <Checkbox
                                    checked={
                                        getField(
                                            field.bindData,
                                        ) as unknown as boolean
                                    }
                                    onCheckedChange={checked =>
                                        handleChange(field, checked === true)
                                    }
                                    aria-invalid={!!errors[field.bindData]}
                                />
                                <Label>
                                    {field.placeholder ?? field.label}
                                </Label>
                            </div>
                        ) : field.type === 'datetime' ? (
                            <div className='flex flex-col gap-2 sm:flex-row'>
                                <Popover
                                    open={
                                        openDatePickers[field.bindData] === true
                                    }
                                    onOpenChange={open =>
                                        setOpenDatePickers(prev => ({
                                            ...prev,
                                            [field.bindData]: open,
                                        }))
                                    }
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant='outline'
                                            className='w-full justify-between font-normal sm:w-52'
                                        >
                                            {normalizeDateValue(
                                                getField(field.bindData),
                                            )
                                                ? format(
                                                      normalizeDateValue(
                                                          getField(
                                                              field.bindData,
                                                          ),
                                                      ) as Date,
                                                      'dd.MM.yyyy',
                                                      { locale: ru },
                                                  )
                                                : 'Выберите дату'}
                                            <ChevronDownIcon />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className='w-auto overflow-hidden p-0'
                                        align='start'
                                    >
                                        <Calendar
                                            locale={ru}
                                            mode='single'
                                            selected={normalizeDateValue(
                                                getField(field.bindData),
                                            )}
                                            captionLayout='dropdown'
                                            defaultMonth={normalizeDateValue(
                                                getField(field.bindData),
                                            )}
                                            onSelect={selectedDate => {
                                                if (!selectedDate) {
                                                    return
                                                }

                                                const currentValue =
                                                    normalizeDateValue(
                                                        getField(
                                                            field.bindData,
                                                        ),
                                                    ) ?? new Date()
                                                const nextValue = new Date(
                                                    selectedDate,
                                                )
                                                nextValue.setHours(
                                                    currentValue.getHours(),
                                                    currentValue.getMinutes(),
                                                    currentValue.getSeconds(),
                                                    0,
                                                )

                                                handleChange(field, nextValue)
                                                setOpenDatePickers(prev => ({
                                                    ...prev,
                                                    [field.bindData]: false,
                                                }))
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Input
                                    type='time'
                                    lang='ru-RU'
                                    step='1'
                                    className='bg-background appearance-none sm:w-44 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
                                    value={formatTimeValue(
                                        normalizeDateValue(
                                            getField(field.bindData),
                                        ),
                                    )}
                                    onChange={event => {
                                        const [hours, minutes, seconds = '0'] =
                                            event.target.value.split(':')

                                        const currentValue =
                                            normalizeDateValue(
                                                getField(field.bindData),
                                            ) ?? new Date()
                                        const nextValue = new Date(currentValue)
                                        nextValue.setHours(
                                            Number(hours),
                                            Number(minutes),
                                            Number(seconds),
                                            0,
                                        )

                                        handleChange(field, nextValue)
                                    }}
                                    aria-invalid={!!errors[field.bindData]}
                                />
                            </div>
                        ) : field.type === 'kv-object' ? (
                            <KeyValueObjectEditor
                                initialValue={
                                    getField(field.bindData) as
                                        | Record<string, unknown>
                                        | null
                                        | undefined
                                }
                                onChange={value =>
                                    updateField(
                                        field.bindData,
                                        value as T[keyof T],
                                    )
                                }
                                onErrorChange={error =>
                                    setErrors(prev => ({
                                        ...prev,
                                        [field.bindData]: error,
                                    }))
                                }
                            />
                        ) : (
                            <Input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={
                                    getField(field.bindData) as
                                        | string
                                        | number
                                        | string[]
                                        | undefined
                                }
                                onChange={e =>
                                    handleChange(field, e.target.value)
                                }
                                aria-invalid={!!errors[field.bindData]}
                            />
                        )}
                        {errors[field.bindData] ? (
                            <p className='text-destructive mt-1 text-sm'>
                                {errors[field.bindData]}
                            </p>
                        ) : null}
                    </div>
                )
            })}
        </>
    )
}

export default DefaultFormBase
