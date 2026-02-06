import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { toString } from '@/Utility/to_string.ts'
import FileSystemTreeView, {
    type DataNode,
} from '@Components/Common/FileSystemTreeView.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { ObjectInstance, ObjectInstanceUpdate } from '@Schemas'
import { objectInstanceSchema } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

interface Props {
    instance: ObjectInstance
}

function InstanceTreeView({ instance }: Props) {
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [instanceTree, setInstanceTree] = useState<
        DataNode<ObjectInstance>[] | null
    >(null)

    const [openIds, setOpenIds] = useState<Set<number>>(new Set())
    const [editTargetInstance, setEditTargetInstance] =
        useState<ObjectInstance | null>(null)

    async function loadInstanceChildren(
        id: number,
    ): Promise<DataNode<ObjectInstance>[]> {
        try {
            const children: ObjectInstance[] =
                await services.objectsInstancesService.getInstancesByParentId(
                    id,
                )

            return children.map((element: ObjectInstance) => {
                return {
                    id: element.id,
                    data: element,
                    children: null,
                } as DataNode<ObjectInstance>
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
        setInstanceTree(null)
        loadInstanceChildren(instance.id).then(data => setInstanceTree(data))
    }, [instance])

    async function onInstanceChildrenToggle(id: number): Promise<void> {
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

    function onInstanceChildrenLoaded(
        id: number,
        children: DataNode<ObjectInstance>[],
    ) {
        const attachChildren = (
            nodes: DataNode<ObjectInstance>[],
        ): DataNode<ObjectInstance>[] => {
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

        setInstanceTree(prev => prev && attachChildren(prev))
    }

    function onInstanceChildrenClick(id: number) {
        navigate(`/instances/${id}`)
    }

    function handleChangeRequest(objectInstance: ObjectInstance) {
        setEditTargetInstance(objectInstance)
    }

    async function handleDeleteRequest(objectInstance: ObjectInstance) {
        await services.objectsInstancesService.delete(objectInstance.id)
        setInstanceTree(await loadInstanceChildren(instance.id))
    }

    async function confirmEditInstance(data: ObjectInstanceUpdate | null) {
        if (!editTargetInstance || !data) {
            setEditTargetInstance(null)
            return
        }

        await services.objectsInstancesService.update(
            editTargetInstance.id,
            data,
        )
        setEditTargetInstance(null)
        setInstanceTree(await loadInstanceChildren(instance.id))
    }

    function renderItem(node: DataNode<ObjectInstance>) {
        return (
            <span
                onClick={() => onInstanceChildrenClick(node.id)}
                className='ms-2 text-primary'
                role='button'
                style={{ cursor: 'pointer' }}
            >
                {toString(node.data)}
            </span>
        )
    }

    return (
        <>
            <LoadEffect
                data={instanceTree}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <FileSystemTreeView
                    data={instanceTree ? instanceTree : []}
                    openIds={openIds}
                    onToggle={onInstanceChildrenToggle}
                    contextMenuOptions={{
                        Изменить: handleChangeRequest,
                        Удалить: handleDeleteRequest,
                    }}
                    renderItem={renderItem}
                    onRequestChildren={loadInstanceChildren}
                    onChildrenLoaded={onInstanceChildrenLoaded}
                />
            </LoadEffect>
            {editTargetInstance && (
                <EditEntityForm
                    schema={objectInstanceSchema}
                    context={{
                        objectId: editTargetInstance.object_id,
                        parentId: editTargetInstance.parent_id,
                        defaultIsActive: editTargetInstance.is_active,
                    }}
                    source={editTargetInstance}
                    title={`Изменение экземпляра "${editTargetInstance.name}"`}
                    submitCallback={confirmEditInstance}
                />
            )}
        </>
    )
}

export default InstanceTreeView
