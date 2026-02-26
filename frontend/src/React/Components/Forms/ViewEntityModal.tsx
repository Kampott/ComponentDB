import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import ViewEntityInfo from '@Components/Forms/ViewEntityInfo.tsx'
import type { EntityFields, EntitySchema, InferEntity } from '@Schemas'

interface Props<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
> {
    schema: EntitySchema<Schema, Context, Fields>
    context: Context
    source: InferEntity<EntitySchema<Schema, Context, Fields>>
    title: string
    onClose: () => void
}

function ViewEntityModal<
    Schema extends object,
    Context,
    Fields extends EntityFields<Schema, Context>,
>({ schema, context, source, title, onClose }: Props<Schema, Context, Fields>) {
    return (
        <Dialog open={true} onOpenChange={open => !open && onClose()}>
            <DialogContent className='sm:max-w-[560px]'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <ViewEntityInfo
                    schema={schema}
                    context={context}
                    source={source}
                />
                <DialogFooter>
                    <Button variant='outline' onClick={onClose}>
                        Закрыть
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ViewEntityModal
