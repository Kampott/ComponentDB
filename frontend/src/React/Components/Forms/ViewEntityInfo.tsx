import { useEffect, useState } from 'react'

import Form from 'react-bootstrap/Form'

import LoadEffect from '@Components/Common/LoadEffect.tsx'
import {
    generateReadViewFromSchema,
    type ReadViewField,
} from '@Kernel/Forms/EntityFormGenerator.ts'
import type { EntityFields, EntitySchema, InferEntity } from '@Schemas'

interface Props<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
> {
    schema: EntitySchema<Schema, Context, Fields>
    context: Context
    source: InferEntity<EntitySchema<Schema, Context, Fields>>
}

function ViewEntityInfo<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
>({ schema, context, source }: Props<Schema, Context, Fields>) {
    const [readFields, setReadFields] = useState<ReadViewField[] | null>(null)

    useEffect(() => {
        async function load() {
            const fields = await generateReadViewFromSchema(
                schema,
                context,
                source,
            )
            setReadFields(fields)
        }

        load()
    }, [schema, context, source])

    return (
        <LoadEffect
            data={readFields}
            contentSize={{ width: '100%', height: '1rem' }}
        >
            <Form>
                {(readFields ?? []).map(field => (
                    <Form.Group key={field.key} className='mb-3'>
                        <Form.Label>{field.label}</Form.Label>
                        <Form.Control plaintext readOnly value={field.value} />
                    </Form.Group>
                ))}
            </Form>
        </LoadEffect>
    )
}

export default ViewEntityInfo
