import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Button from 'react-bootstrap/Button'

import FileSystemTreeView, {
    type DataNode,
} from '@Components/Common/FileSystemTreeView.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { ObjectType, ObjectTypeAdd, ObjectTypeUpdate } from '@RestSchemas'
import { objectTypeSchema } from '@RestSchemas'
import { useServicesStore } from '@StorageImpl'

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

    const [formParentObjectType, setFormParentObjectType] =
        useState<ObjectType>(objectType)
    const [formShow, setFormShow] = useState(false)
    const [editTargetType, setEditTargetType] = useState<ObjectType | null>(
        null,
    )

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
        setFormParentObjectType(objectType)
    }

    function handleAddRequest(objectType: ObjectType) {
        setFormParentObjectType(objectType)
        setFormShow(true)
    }

    function handleChangeRequest(objectType: ObjectType) {
        setEditTargetType(objectType)
    }

    async function handleDeleteRequest(currentObjectType: ObjectType) {
        await services.objectsTypesService.deleteType(currentObjectType.id)
        setTypeTree(await loadObjectTypeChildren(objectType.id))
    }

    async function confirmEditType(data: ObjectTypeUpdate | null) {
        if (!editTargetType || !data) {
            setEditTargetType(null)
            return
        }

        await services.objectsTypesService.updateType(editTargetType.id, data)
        setEditTargetType(null)
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
                    contextMenuOptions={{
                        Добавить: handleAddRequest,
                        Изменить: handleChangeRequest,
                        Удалить: handleDeleteRequest,
                    }}
                    onRequestChildren={loadObjectTypeChildren}
                    onChildrenLoaded={onObjectChildrenLoaded}
                />
            </LoadEffect>

            {formShow && (
                <AddEntityForm
                    schema={objectTypeSchema}
                    context={{ parentTypeId: formParentObjectType.id }}
                    defaults={{ name: '' }}
                    title='Добавление нового типа'
                    submitCallback={confirmAddType}
                />
            )}
            {editTargetType && (
                <EditEntityForm
                    schema={objectTypeSchema}
                    context={{ parentTypeId: editTargetType.parent_id }}
                    source={editTargetType}
                    title={`Изменение типа "${editTargetType.name}"`}
                    submitCallback={confirmEditType}
                />
            )}
        </>
    )
}

export default TypeTreeView
