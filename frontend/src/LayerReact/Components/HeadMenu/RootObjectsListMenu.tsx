import Offcanvas from 'react-bootstrap/Offcanvas'

import { type ReactNode, useEffect, useState } from 'react'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { ObjectType, ObjectTypeAdd, ObjectTypeUpdate } from '@RestSchemas'
import { objectTypeSchema } from '@RestSchemas'
import { useServicesStore } from '@StorageImpl'
import Button from 'react-bootstrap/Button'
import { useNavigate } from 'react-router-dom'

interface Props {
    showObjectsMenu: boolean
    handleClose: CallableFunction
}

function RootObjectsListMenu({ showObjectsMenu, handleClose }: Props) {
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [rootObjectTypes, setRootObjectTypes] = useState<ObjectType[] | null>(
        null,
    )
    const [formShow, setFormShow] = useState(false)
    const [editTargetType, setEditTargetType] = useState<ObjectType | null>(
        null,
    )

    function handleObjectTypeClick(objectType: ObjectType) {
        navigate(`/types/${objectType.id}`)
    }

    async function loadRootObjectTypes() {
        setRootObjectTypes(null)
        try {
            setRootObjectTypes(
                await services.objectsTypesService.getRootTypes(),
            )
        } catch (error) {
            handleApiError(error as RestApiError, {
                navigate,
                showToast: m => alert(m),
            })
        }
    }

    function renderObjectType(objectType: ObjectType): ReactNode {
        return <>{objectType.name}</>
    }

    useEffect(() => {
        loadRootObjectTypes()
    }, [])

    async function confirmAddType(data: ObjectTypeAdd | null) {
        if (!data) {
            setFormShow(false)
            return
        }

        await services.objectsTypesService.addType(data)
        setFormShow(false)
        await loadRootObjectTypes()
    }

    function handleChangeRequest(objectType: ObjectType) {
        setEditTargetType(objectType)
    }

    async function handleDeleteRequest(objectType: ObjectType) {
        await services.objectsTypesService.deleteType(objectType.id)
        await loadRootObjectTypes()
    }

    async function confirmEditType(data: ObjectTypeUpdate | null) {
        if (!editTargetType || !data) {
            setEditTargetType(null)
            return
        }

        await services.objectsTypesService.updateType(editTargetType.id, data)
        setEditTargetType(null)
        await loadRootObjectTypes()
    }

    return (
        <>
            <Offcanvas
                show={showObjectsMenu}
                onHide={handleClose}
                placement='start'
            >
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Список типов</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <LoadEffect
                        data={rootObjectTypes}
                        contentSize={{ height: '20px', width: '100%' }}
                    >
                        <DefaultList
                            data={rootObjectTypes ? rootObjectTypes : []}
                            onClick={handleObjectTypeClick}
                            renderItem={renderObjectType}
                            onChangeRequest={handleChangeRequest}
                            onDeleteRequest={handleDeleteRequest}
                        />
                    </LoadEffect>
                    <Button
                        variant='primary'
                        className='mt-4'
                        onClick={() => setFormShow(true)}
                    >
                        Добавить тип
                    </Button>
                </Offcanvas.Body>
            </Offcanvas>

            {formShow && (
                <AddEntityForm
                    schema={objectTypeSchema}
                    context={{ parentTypeId: null }}
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

export default RootObjectsListMenu
