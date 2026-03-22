import { useEffect, useState } from 'react'

import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import type {
    EntityContext,
    EntityCoreSchema,
    InferCreate,
} from '@EntityDsl/Core'
import {
    generateCreateFormFromSchema,
    type EntityUiSchema,
} from '@EntityDsl/Ui'
import type { FormField } from '@Kernel/Forms/FormTypes.ts'

interface Props<S extends EntityCoreSchema<any, any, any>> {
    schema: S
    uiSchema: EntityUiSchema<S>
    context: EntityContext<S>
    defaults?: Partial<InferCreate<S>>
    title: string
    submitCallback: (data: InferCreate<S> | null) => void
}

/**
 * Универсальная модальная "create"-форма для произвольной схемы сущности
 * Построение полей полностью делегируется generateCreateFormFromSchema(...),
 * компонент отвечает только за асинхронную загрузку и рендер
 */
function AddEntityForm<S extends EntityCoreSchema<any, any, any>>({
    schema,
    uiSchema,
    context,
    defaults,
    title,
    submitCallback,
}: Props<S>) {
    const [formFields, setFormFields] = useState<
        FormField<InferCreate<S>, keyof InferCreate<S>>[] | null
    >(null)
    const [defaultData, setDefaultData] = useState<InferCreate<S>>(
        {} as InferCreate<S>,
    )

    useEffect(() => {
        async function load() {
            const result = await generateCreateFormFromSchema(
                schema,
                uiSchema,
                context,
                defaults ?? {},
            )
            setFormFields(result.formFields)
            setDefaultData(result.defaultData)
        }

        load()
    }, [schema, uiSchema, context, defaults])

    return (
        <LoadEffect
            data={formFields}
            contentSize={{ width: '100%', height: '1rem' }}
        >
            <DefaultPopupForm
                defaultData={defaultData}
                title={title}
                fields={formFields ? formFields : []}
                onSubmit={submitCallback}
            />
        </LoadEffect>
    )
}

export default AddEntityForm
