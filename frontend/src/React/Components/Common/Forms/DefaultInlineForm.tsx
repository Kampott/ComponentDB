import { useState } from 'react'

import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'

import type { FormField } from '@Kernel/Forms/FormTypes.ts'
import DefaultFormBase from './DefaultFormBase.tsx'

interface Props<T> {
    defaultData: T
    submitButtonText?: string
    fields: FormField<T, keyof T>[]
    onSubmit: (data: T | null) => void
}

function DefaultInlineForm<T>({
    defaultData,
    submitButtonText,
    fields,
    onSubmit,
}: Props<T>) {
    const [data, setData] = useState<T>(defaultData)
    const [errors, setErrors] = useState<
        Partial<Record<keyof T, string | null>>
    >({})

    function handleSubmit() {
        let hasError = false
        const newErrors: Partial<Record<keyof T, string | null>> = {}

        fields.forEach(f => {
            if (f.validator) {
                const err = f.validator(data[f.bindData])
                newErrors[f.bindData] = err
                if (err) hasError = true
            }
        })
        setErrors(newErrors)

        if (!hasError) {
            onSubmit(data)
        }
    }

    return (
        <Form>
            <DefaultFormBase
                fields={fields}
                data={data}
                setData={setData}
                errors={errors}
                setErrors={setErrors}
            />
            <Form.Group className='d-flex justify-content-center mt-3'>
                <Button variant='primary' onClick={handleSubmit}>
                    {submitButtonText ? submitButtonText : 'Подтвердить'}
                </Button>
            </Form.Group>
        </Form>
    )
}

export default DefaultInlineForm
