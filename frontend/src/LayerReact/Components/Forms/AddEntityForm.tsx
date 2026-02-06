import { useEffect, useState } from 'react'

import { generateCreateFormFromSchema } from '@/LayerKernel/Forms/EntityFormGenerator.ts'
import type { FormField } from '@/LayerKernel/Forms/FormTypes.ts'
import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import type { EntityFields, EntitySchema, InferCreate } from '@RestSchemas'

interface Props<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
> {
    schema: EntitySchema<Schema, Context, Fields>
    context: Context
    defaults?: Partial<InferCreate<EntitySchema<Schema, Context, Fields>>>
    title: string
    submitCallback: (
        data: InferCreate<EntitySchema<Schema, Context, Fields>> | null,
    ) => void
}

/**
 * Generic "create" modal form for an arbitrary entity schema.
 * It delegates all field construction to generateCreateFormFromSchema(...)
 * and only handles async load + rendering.
 */
function AddEntityForm<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
>({
    schema,
    context,
    defaults,
    title,
    submitCallback,
}: Props<Schema, Context, Fields>) {
    type SchemaDefinition = EntitySchema<Schema, Context, Fields>

    const [formFields, setFormFields] = useState<
        | FormField<
              InferCreate<SchemaDefinition>,
              keyof InferCreate<SchemaDefinition>
          >[]
        | null
    >(null)
    const [defaultData, setDefaultData] = useState<
        InferCreate<SchemaDefinition>
    >({} as InferCreate<SchemaDefinition>)

    useEffect(() => {
        async function load() {
            // Build typed controls and initial payload from DSL schema.
            const result = await generateCreateFormFromSchema(
                schema,
                context,
                defaults ?? {},
            )
            setFormFields(result.formFields)
            setDefaultData(result.defaultData)
        }

        load()
    }, [schema, context, defaults])

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
