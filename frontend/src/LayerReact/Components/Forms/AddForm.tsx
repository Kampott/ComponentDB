import { useEffect, useState } from 'react'

import { generateAddFormFromMeta } from '@/LayerKernel/Forms/FormGenerator.ts'
import type { FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import type { SchemaAdd, SchemaMeta } from '@RestSchemas'

interface Props<Schema> {
    schemaMeta: SchemaMeta<Schema>
    optionsArgs: Partial<Record<keyof SchemaAdd<Schema>, number>>
    defaultValuesArgs: Partial<
        Record<
            keyof SchemaAdd<Schema>,
            SchemaAdd<Schema>[keyof SchemaAdd<Schema>]
        >
    >
    submitCallback: (data: SchemaAdd<Schema> | null) => void
}

function AddForm<Schema>({
    schemaMeta,
    optionsArgs,
    defaultValuesArgs,
    submitCallback,
}: Props<Schema>) {
    const [formFields, setFormFields] = useState<
        FormField<SchemaAdd<Schema>, keyof SchemaAdd<Schema>>[] | null
    >(null)
    const [defaultData, setDefaultData] = useState<SchemaAdd<Schema>>(
        {} as SchemaAdd<Schema>,
    )

    useEffect(() => {
        async function load() {
            const result = await generateAddFormFromMeta(
                schemaMeta,
                optionsArgs,
                defaultValuesArgs,
            )

            setFormFields(result.formFields)
            setDefaultData(result.defaultData)
        }

        load()
    }, [schemaMeta, optionsArgs, defaultValuesArgs])

    return (
        <LoadEffect
            data={formFields}
            contentSize={{ width: '100%', height: '1rem' }}
        >
            <DefaultPopupForm
                defaultData={defaultData}
                title='Добавление нового объекта'
                fields={formFields ? formFields : []}
                onSubmit={submitCallback}
            />
        </LoadEffect>
    )
}

export default AddForm
