import { useState } from 'react'

import { Button } from '@Components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@Components/ui/dialog'
import type { FormField } from '@Kernel/Forms/FormTypes.ts'
import DefaultFormBase from './DefaultFormBase.tsx'

interface Props<T, Field extends keyof T = keyof T> {
    defaultData: T
    title: string
    fields: FormField<T, Field>[]
    onSubmit: (data: T | null) => void
}

function DefaultPopupForm<T>({
    defaultData,
    title,
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
        <Dialog open={true} onOpenChange={open => !open && onSubmit(null)}>
            <DialogContent className='sm:max-w-[560px]'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div>
                    <DefaultFormBase
                        fields={fields as FormField<T, keyof T>[]}
                        data={data}
                        setData={setData}
                        errors={errors}
                        setErrors={setErrors}
                    />
                </div>
                <DialogFooter>
                    <Button variant='outline' onClick={() => onSubmit(null)}>
                        Отмена
                    </Button>
                    <Button onClick={handleSubmit}>Сохранить</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default DefaultPopupForm
