import { useEffect, useState } from 'react'

import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { Label } from '@Components/ui/label'
import type {
    EntityContext,
    EntityCoreSchema,
    InferEntity,
} from '@EntityDsl/Core'
import type { EntityUiSchema } from '@EntityDsl/Ui'
import { generateReadViewFromSchema, type ReadViewField } from '@EntityDsl/Ui'

interface Props<S extends EntityCoreSchema<any, any, any>> {
    uiSchema: EntityUiSchema<S>
    context: EntityContext<S>
    source: InferEntity<S>
}

function ViewEntityInfo<S extends EntityCoreSchema<any, any, any>>({
    uiSchema,
    context,
    source,
}: Props<S>) {
    const [readFields, setReadFields] = useState<ReadViewField[] | null>(null)

    useEffect(() => {
        async function load() {
            const fields = await generateReadViewFromSchema(
                uiSchema,
                context,
                source,
            )
            setReadFields(fields)
        }

        load()
    }, [uiSchema, context, source])

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
