import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from 'react-bootstrap/Button'

import { RestApiError } from '@/Http/RestApiClient.ts'
import type { ObjectType, ObjectTypeAdd } from '@/Schemas/ObjectType.ts'
import { useServicesStore } from '@/Storages/Zustand/ServicesStore.ts'
import { handleApiError } from '@/Utility/handle_api_error.ts'
import FileSystemTreeView, {
    type DataNode,
} from '../../Common/FileSystemTreeView.tsx'
import LoadEffect from '../../Common/LoadEffect.tsx'
import AddObjectTypeForm from '../../Forms/AddObjectTypeForm.tsx'

interface Props {
    objectType: ObjectType
}

function TypeTreeView({ objectType }: Props) {
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [typeTree, setTypeTree] = useState<DataNode<ObjectType>[] | null>(
        null,
    )

    const [openIds, setOpenIds] = useState<Set<number>>(new Set())

    const [formShow, setFormShow] = useState(false)

    async function loadObjectTypeChildren(
        id: number,
    ): Promise<DataNode<ObjectType>[]> {
        try {
            const children: ObjectType[] =
                await services.objectsTypesService.getTypesByParentId(id)

            return children.map((element: ObjectType) => {
                return {
                    id: element.id,
                    data: element,
                    children: null,
                } as DataNode<ObjectType>
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
        setTypeTree(null)
        loadObjectTypeChildren(objectType.id).then(data => setTypeTree(data))
    }, [objectType])

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

    function onObjectChildrenLoaded(
        id: number,
        children: DataNode<ObjectType>[],
    ) {
        const attachChildren = (
            nodes: DataNode<ObjectType>[],
        ): DataNode<ObjectType>[] => {
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

        setTypeTree(prev => prev && attachChildren(prev))
    }

    async function onTypeChildrenClick(id: number): Promise<void> {
        navigate(`/types/${id}`)
    }

    function renderItem(node: DataNode<ObjectType>) {
        return (
            <span
                onClick={() => onTypeChildrenClick(node.id)}
                className='ms-2 text-primary'
                role='button'
                style={{ cursor: 'pointer' }}
            >
                {node.data.name}
            </span>
        )
    }

    async function confirmAddType(data: ObjectTypeAdd | null) {
        if (!data) {
            setFormShow(false)
            return
        }

        await services.objectsTypesService.addType(data)
        setFormShow(false)
        setTypeTree(await loadObjectTypeChildren(objectType.id))
    }

    return (
        <>
            <Button
                variant='primary'
                className='mt-4'
                onClick={() => setFormShow(true)}
            >
                Добавить тип
            </Button>
            <LoadEffect
                data={typeTree}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <FileSystemTreeView
                    data={typeTree ? typeTree : []}
                    openIds={openIds}
                    onToggle={onObjectChildrenToggle}
                    renderItem={renderItem}
                    onRequestChildren={loadObjectTypeChildren}
                    onChildrenLoaded={onObjectChildrenLoaded}
                />
            </LoadEffect>

            {formShow && (
                <AddObjectTypeForm
                    parentObjectType={objectType}
                    submitCallback={confirmAddType}
                />
            )}
        </>
    )
}

export default TypeTreeView
