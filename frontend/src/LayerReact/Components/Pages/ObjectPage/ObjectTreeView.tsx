import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from 'react-bootstrap/Button'

import { toString } from '@/Utility/to_string.ts'
import FileSystemTreeView, {
    type DataNode,
} from '@Components/Common/FileSystemTreeView.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object } from '@RestSchemas'
import { useServicesStore } from '@StorageImpl'
import AddObjectForm from '../../Forms/AddObjectForm.tsx'

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

    const [formShow, setFormShow] = useState(false)

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

        await services.objectService.addObject(data)
        setFormShow(false)
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
                    renderItem={renderItem}
                    onRequestChildren={loadObjectChildren}
                    onChildrenLoaded={onObjectChildrenLoaded}
                />
            </LoadEffect>

            {formShow && (
                <AddObjectForm
                    parentObject={object}
                    submitCallback={confirmAddObject}
                />
            )}
        </>
    )
}

export default ObjectTreeView
