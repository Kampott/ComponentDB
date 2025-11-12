import type { ValidationResult } from '@RestSchemas'

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'password'

export interface FormFieldOption<T> {
    label: string
    value: T
}

export interface FormField<T, K extends keyof T> {
    bindData: K
    label: string
    type: FieldType
    placeholder?: string
    options?: FormFieldOption<T[K]>[]
    validator?: (value: T[K]) => ValidationResult
}
