import { type Dispatch, type SetStateAction, useEffect } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import type { FieldType, FormField } from '@Kernel/Forms/FormTypes.ts'

interface Props<T> {
    data: T
    setData: Dispatch<SetStateAction<T>>
    errors: Partial<Record<keyof T, string | null>>
    setErrors: Dispatch<SetStateAction<Partial<Record<keyof T, string | null>>>>
    fields: FormField<T, keyof T>[]
}

function DefaultFormBase<T>({
    data,
    setData,
    errors,
    setErrors,
    fields,
}: Props<T>) {
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
