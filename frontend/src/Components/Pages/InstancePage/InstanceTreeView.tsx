import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { RestApiError } from '@/Http/RestApiClient.ts'
import type { ObjectInstance } from '@/Schemas/ObjectInstance.ts'
import { useServicesStore } from '@/Storages/Zustand.ts'
import { handleApiError } from '@/Utility/handle_api_error.ts'
import { toString } from '@/Utility/to_string.ts'
import FileSystemTreeView, {
    type DataNode,
} from '../../Common/FileSystemTreeView.tsx'
import LoadEffect from '../../Common/LoadEffect.tsx'

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

    function handleAddChildRequest(objectInstance: ObjectInstance) {
        console.log(objectInstance)
    }

    function handleChangeRequest(objectInstance: ObjectInstance) {
        console.log(objectInstance)
    }

    function handleDeleteRequest(objectInstance: ObjectInstance) {
        console.log(objectInstance)
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
                    renderItem={renderItem}
                    onRequestChildren={loadInstanceChildren}
                    onChildrenLoaded={onInstanceChildrenLoaded}
                    onAddChildRequest={handleAddChildRequest}
                    onChangeRequest={handleChangeRequest}
                    onDeleteRequest={handleDeleteRequest}
                />
            </LoadEffect>
        </>
    )
}

export default InstanceTreeView
