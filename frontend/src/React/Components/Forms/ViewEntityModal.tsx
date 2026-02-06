import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

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
        <Modal show={true} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <ViewEntityInfo
                    schema={schema}
                    context={context}
                    source={source}
                />
            </Modal.Body>
            <Modal.Footer>
                <Button variant='secondary' onClick={onClose}>
                    Закрыть
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

export default ViewEntityModal
