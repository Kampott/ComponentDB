import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from 'react-bootstrap/Button'

import { toString } from '@/Utility/to_string.ts'
import FileSystemTreeView, {
    type DataNode,
} from '@Components/Common/FileSystemTreeView.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object, ObjectAdd, ObjectUpdate } from '@Schemas'
import { objectSchema } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

interface Props {
    object: Object
}

function ObjectTreeView({ object }: Props) {
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [objectTree, setObjectTree] = useState<DataNode<Object>[] | null>(
        null,
    )

    const [openIds, setOpenIds] = useState<Set<number>>(new Set())

    const [formParentObject, setFormParentObject] = useState<Object>(object)
    const [formShow, setFormShow] = useState(false)
    const [editTargetObject, setEditTargetObject] = useState<Object | null>(
        null,
    )
    const [viewTargetObject, setViewTargetObject] = useState<Object | null>(
        null,
    )

    async function loadObjectChildren(id: number): Promise<DataNode<Object>[]> {
        try {
            const children: Object[] =
                await services.objectService.getObjectsByParentId(id)

            return children.map((element: Object) => {
                return {
                    id: element.id,
                    data: element,
                    children: null,
                } as DataNode<Object>
            })
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
            return []
        }
    }

    useEffect(() => {
        setObjectTree(null)
        loadObjectChildren(object.id).then(data => setObjectTree(data))
    }, [object])

    async function onObjectChildrenToggle(id: number): Promise<void> {
        setOpenIds((prev: Set<number>): Set<number> => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    function onObjectChildrenLoaded(id: number, children: DataNode<Object>[]) {
        const attachChildren = (
            nodes: DataNode<Object>[],
        ): DataNode<Object>[] => {
            return nodes.map(n => {
                if (n.id === id) {
                    return { ...n, children, childrenLoaded: true }
                }
                if (n.children) {
                    return { ...n, children: attachChildren(n.children) }
                }
                return n
            })
        }

        setObjectTree(prev => prev && attachChildren(prev))
    }

    function onObjectChildrenClick(id: number) {
        navigate(`/objects/${id}`)
    }

    function renderItem(node: DataNode<Object>) {
        return (
            <span
                onClick={() => onObjectChildrenClick(node.id)}
                className='ms-2 text-primary'
                role='button'
                style={{ cursor: 'pointer' }}
            >
                {toString(node.data)}
            </span>
        )
    }

    async function confirmAddObject(data: ObjectAdd | null) {
        if (!data) {
            setFormShow(false)
            return
        }

        console.log(data)

        await services.objectService.create(data)
        setFormShow(false)
        setObjectTree(await loadObjectChildren(object.id))
        setFormParentObject(object)
    }

    function handleAddRequest(object: Object) {
        setFormParentObject(object)
        setFormShow(true)
    }

    function handleChangeRequest(object: Object) {
        setEditTargetObject(object)
    }

    function handleViewRequest(currentObject: Object) {
        setViewTargetObject(currentObject)
    }

    async function handleDeleteRequest(currentObject: Object) {
        await services.objectService.delete(currentObject.id)
        setObjectTree(await loadObjectChildren(object.id))
    }

    async function confirmEditObject(data: ObjectUpdate | null) {
        if (!editTargetObject || !data) {
            setEditTargetObject(null)
            return
        }

        await services.objectService.update(editTargetObject.id, data)
        setEditTargetObject(null)
        setObjectTree(await loadObjectChildren(object.id))
    }

    return (
        <>
            <Button
                variant='primary'
                className='mt-4'
                onClick={() => setFormShow(true)}
            >
                Добавить объект
            </Button>
            <LoadEffect
                data={objectTree}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <FileSystemTreeView
                    data={objectTree ? objectTree : []}
                    openIds={openIds}
                    onToggle={onObjectChildrenToggle}
                    contextMenuOptions={{
                        Посмотреть: handleViewRequest,
                        Добавить: handleAddRequest,
                        Изменить: handleChangeRequest,
                        Удалить: handleDeleteRequest,
                    }}
                    renderItem={renderItem}
                    onRequestChildren={loadObjectChildren}
                    onChildrenLoaded={onObjectChildrenLoaded}
                />
            </LoadEffect>

            {formShow && (
                <AddEntityForm
                    schema={objectSchema}
                    context={{
                        parentTypeId: formParentObject.type_id,
                        parentObjectId: formParentObject.id,
                    }}
                    defaults={{ name: '' }}
                    title='Добавление нового объекта'
                    submitCallback={confirmAddObject}
                />
            )}
            {editTargetObject && (
                <EditEntityForm
                    schema={objectSchema}
                    context={{
                        parentTypeId: editTargetObject.type_id,
                        parentObjectId: editTargetObject.parent_id,
                    }}
                    source={editTargetObject}
                    title={`Изменение объекта "${editTargetObject.name}"`}
                    submitCallback={confirmEditObject}
                />
            )}
            {viewTargetObject && (
                <ViewEntityModal
                    schema={objectSchema}
                    context={{
                        parentTypeId: viewTargetObject.type_id,
                        parentObjectId: viewTargetObject.parent_id,
                    }}
                    source={viewTargetObject}
                    title={`Просмотр объекта "${viewTargetObject.name}"`}
                    onClose={() => setViewTargetObject(null)}
                />
            )}
        </>
    )
}

export default ObjectTreeView
