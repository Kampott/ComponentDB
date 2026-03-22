import { useEffect, useState } from 'react'

import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import type {
    EntityContext,
    EntityCoreSchema,
    InferEntity,
    InferUpdate,
} from '@EntityDsl/Core'
import {
    generateUpdateFormFromSchema,
    type EntityUiSchema,
} from '@EntityDsl/Ui'
import type { FormField } from '@Kernel/Forms/FormTypes.ts'

interface Props<S extends EntityCoreSchema<any, any, any>> {
    schema: S
    uiSchema: EntityUiSchema<S>
    context: EntityContext<S>
    source: InferEntity<S>
    defaults?: Partial<InferUpdate<S>>
    title: string
    submitCallback: (data: InferUpdate<S> | null) => void
}

/**
 * Универсальная модальная "update"-форма для произвольной схемы сущности
 * Форма генерируется из update-политик и предзаполняется данными из `source`
 */
function EditEntityForm<S extends EntityCoreSchema<any, any, any>>({
    schema,
    uiSchema,
    context,
    source,
    defaults,
    title,
    submitCallback,
}: Props<S>) {
    type UpdateModel = InferUpdate<S>

    const [formFields, setFormFields] = useState<
        FormField<UpdateModel, keyof UpdateModel>[] | null
    >(null)
    const [defaultData, setDefaultData] = useState<UpdateModel>(
        {} as UpdateModel,
    )

    useEffect(() => {
        async function load() {
            const result = await generateUpdateFormFromSchema(
                schema,
                uiSchema,
                context,
                source,
                defaults ?? {},
            )
            setFormFields(result.formFields)
            setDefaultData(result.defaultData)
        }

        load()
    }, [schema, uiSchema, context, source, defaults])

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

export default EditEntityForm
