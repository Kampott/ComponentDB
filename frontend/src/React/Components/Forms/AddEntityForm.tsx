import { useEffect, useState } from 'react'

import DefaultPopupForm from '@Components/Common/Forms/DefaultPopupForm.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { generateCreateFormFromSchema } from '@Kernel/Forms/EntityFormGenerator.ts'
import type { FormField } from '@Kernel/Forms/FormTypes.ts'
import type { EntityFields, EntitySchema, InferCreate } from '@Schemas'

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
 * Универсальная модальная "create"-форма для произвольной схемы сущности
 * Построение полей полностью делегируется generateCreateFormFromSchema(...),
 * компонент отвечает только за асинхронную загрузку и рендер
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
            // Собираем типизированные контролы и стартовый payload из DSL-схемы
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
