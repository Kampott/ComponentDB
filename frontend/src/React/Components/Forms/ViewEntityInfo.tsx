import { useEffect, useState } from 'react'

import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { Label } from '@Components/ui/label'
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
            <div className='space-y-3'>
                {(readFields ?? []).map(field => (
                    <div key={field.key} className='space-y-1'>
                        <Label className='text-muted-foreground text-xs'>
                            {field.label}
                        </Label>
                        <div className='bg-muted/30 rounded-md border px-3 py-2 text-sm whitespace-pre-wrap'>
                            {field.value}
                        </div>
                    </div>
                ))}
            </div>
        </LoadEffect>
    )
}

export default ViewEntityInfo
