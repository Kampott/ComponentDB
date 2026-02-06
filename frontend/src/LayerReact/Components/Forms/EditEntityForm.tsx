import { useEffect, useState } from 'react'

import { generateUpdateFormFromSchema } from '@/LayerKernel/Forms/EntityFormGenerator.ts'
import type { FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import type {
    EntityFields,
    EntitySchema,
    InferEntity,
    InferUpdate,
} from '@RestSchemas'

interface Props<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
> {
    schema: EntitySchema<Schema, Context, Fields>
    context: Context
    source: InferEntity<EntitySchema<Schema, Context, Fields>>
    defaults?: Partial<InferUpdate<EntitySchema<Schema, Context, Fields>>>
    title: string
    submitCallback: (
        data: InferUpdate<EntitySchema<Schema, Context, Fields>> | null,
    ) => void
}

/**
 * Generic "update" modal form for an arbitrary entity schema.
 * The form is generated from update policies and prefilled from `source`.
 */
function EditEntityForm<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
>({
    schema,
    context,
    source,
    defaults,
    title,
    submitCallback,
}: Props<Schema, Context, Fields>) {
    type SchemaDefinition = EntitySchema<Schema, Context, Fields>
    type UpdateModel = InferUpdate<SchemaDefinition>

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
                context,
                source,
                defaults ?? {},
            )
            setFormFields(result.formFields)
            setDefaultData(result.defaultData)
        }

        load()
    }, [schema, context, source, defaults])

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
