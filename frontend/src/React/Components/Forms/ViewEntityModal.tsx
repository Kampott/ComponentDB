import ViewEntityInfo from '@Components/Forms/ViewEntityInfo.tsx'
import { Button } from '@Components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@Components/ui/dialog'
import type {
    EntityContext,
    EntityCoreSchema,
    InferEntity,
} from '@EntityDsl/Core'
import type { EntityUiSchema } from '@EntityDsl/Ui'

interface Props<S extends EntityCoreSchema<any, any, any>> {
    uiSchema: EntityUiSchema<S>
    context: EntityContext<S>
    source: InferEntity<S>
    title: string
    onClose: () => void
}

function ViewEntityModal<S extends EntityCoreSchema<any, any, any>>({
    uiSchema,
    context,
    source,
    title,
    onClose,
}: Props<S>) {
    return (
        <Dialog open={true} onOpenChange={open => !open && onClose()}>
            <DialogContent className='sm:max-w-[560px]'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <ViewEntityInfo
                    uiSchema={uiSchema}
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
