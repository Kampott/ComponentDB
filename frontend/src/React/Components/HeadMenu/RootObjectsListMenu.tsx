import { Plus } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import ToolbarActionButton from '@Components/Common/ToolbarActionButton.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@Components/ui/sheet'
import { objectTypeUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { ObjectType, ObjectTypeAdd, ObjectTypeUpdate } from '@Schemas'
import { objectTypeSchema } from '@Schemas'
import { useServicesStore } from '@StorageImpl'
import { useNavigate } from 'react-router-dom'

interface Props {
    showObjectsMenu: boolean
    handleClose: () => void
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
    const [viewTargetType, setViewTargetType] = useState<ObjectType | null>(
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

        await services.objectsTypesService.create(data)
        setFormShow(false)
        await loadRootObjectTypes()
    }

    function handleChangeRequest(objectType: ObjectType) {
        setEditTargetType(objectType)
    }

    function handleViewRequest(objectType: ObjectType) {
        setViewTargetType(objectType)
    }

    async function handleDeleteRequest(objectType: ObjectType) {
        await services.objectsTypesService.delete(objectType.id)
        await loadRootObjectTypes()
    }

    async function confirmEditType(data: ObjectTypeUpdate | null) {
        if (!editTargetType || !data) {
            setEditTargetType(null)
            return
        }

        await services.objectsTypesService.update(editTargetType.id, data)
        setEditTargetType(null)
        await loadRootObjectTypes()
    }

    return (
        <>
            <Sheet
                open={showObjectsMenu}
                onOpenChange={open => {
                    if (!open) {
                        handleClose()
                    }
                }}
            >
                <SheetContent side='left' className='w-full sm:max-w-md'>
                    <SheetHeader>
                        <SheetTitle>Список типов</SheetTitle>
                    </SheetHeader>

                    <div className='mt-4 space-y-4'>
                        <LoadEffect
                            data={rootObjectTypes}
                            contentSize={{ height: '20px', width: '100%' }}
                        >
                            <DefaultList
                                data={rootObjectTypes ? rootObjectTypes : []}
                                onClick={handleObjectTypeClick}
                                renderItem={renderObjectType}
                                onViewRequest={handleViewRequest}
                                onChangeRequest={handleChangeRequest}
                                onDeleteRequest={handleDeleteRequest}
                            />
                        </LoadEffect>

                        <ToolbarActionButton
                            type='button'
                            variant='default'
                            icon={<Plus />}
                            label='Добавить тип'
                            aria-label='Добавить тип'
                            onClick={() => setFormShow(true)}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {formShow && (
                <AddEntityForm
                    schema={objectTypeSchema}
                    uiSchema={objectTypeUiSchema}
                    context={{ parentTypeId: null }}
                    defaults={{ name: '' }}
                    title='Добавление нового типа'
                    submitCallback={confirmAddType}
                />
            )}
            {editTargetType && (
                <EditEntityForm
                    schema={objectTypeSchema}
                    uiSchema={objectTypeUiSchema}
                    context={{ parentTypeId: editTargetType.parent_id }}
                    source={editTargetType}
                    title={`Изменение типа "${editTargetType.name}"`}
                    submitCallback={confirmEditType}
                />
            )}
            {viewTargetType && (
                <ViewEntityModal
                    uiSchema={objectTypeUiSchema}
                    context={{ parentTypeId: viewTargetType.parent_id }}
                    source={viewTargetType}
                    title={`Просмотр типа "${viewTargetType.name}"`}
                    onClose={() => setViewTargetType(null)}
                />
            )}
        </>
    )
}

export default RootObjectsListMenu
