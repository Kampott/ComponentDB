import { type ReactNode, useEffect, useState } from 'react'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import AddEntityForm from '@Components/Forms/AddEntityForm.tsx'
import EditEntityForm from '@Components/Forms/EditEntityForm.tsx'
import ViewEntityModal from '@Components/Forms/ViewEntityModal.tsx'
import { Button } from '@Components/ui/button'
import { propertyTypeUiSchema } from '@EntityUi'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type {
    ObjectType,
    PropertyType,
    PropertyTypeAdd,
    PropertyTypeUpdate,
} from '@Schemas'
import { propertyTypeSchema } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

interface Props {
    objectType: ObjectType
}

function TypePropertiesTab({ objectType }: Props): ReactNode {
    const services = useServicesStore(state => state.services)

    const [objectProperties, setObjectProperties] = useState<
        PropertyType[] | null
    >(null)
    const [instanceProperties, setInstanceProperties] = useState<
        PropertyType[] | null
    >(null)
    const [formShow, setFormShow] = useState(false)
    const [editTargetPropertyType, setEditTargetPropertyType] =
        useState<PropertyType | null>(null)
    const [viewTargetPropertyType, setViewTargetPropertyType] =
        useState<PropertyType | null>(null)

    async function loadProperties(): Promise<void> {
        setObjectProperties(null)
        setInstanceProperties(null)

        try {
            setObjectProperties(
                await services.propertiesTypesService.getPropertyTypesByTypeId(
                    objectType.id,
                    true,
                ),
            )
            setInstanceProperties(
                await services.propertiesTypesService.getPropertyTypesByTypeId(
                    objectType.id,
                    false,
                ),
            )
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    useEffect(() => {
        loadProperties()
    }, [objectType])

    function renderProperty(property: PropertyType): ReactNode {
        return <>{property.name}</>
    }

    async function confirmAddProperty(data: PropertyTypeAdd | null) {
        if (!data) {
            setFormShow(false)
            return
        }

        try {
            await services.propertiesTypesService.create(data)
        } catch (error) {
            handleApiError(error as RestApiError, {
                setFormErrors: errors => alert(errors),
                showToast: m => alert(m),
            })
        } finally {
            setFormShow(false)
            await loadProperties()
        }
    }

    function handleChangeRequest(propertyType: PropertyType) {
        setEditTargetPropertyType(propertyType)
    }

    function handleViewRequest(propertyType: PropertyType) {
        setViewTargetPropertyType(propertyType)
    }

    function handleDeleteRequest(propertyType: PropertyType) {
        console.log(propertyType)
    }

    async function confirmEditPropertyType(data: PropertyTypeUpdate | null) {
        if (!editTargetPropertyType || !data) {
            setEditTargetPropertyType(null)
            return
        }

        await services.propertiesTypesService.update(
            editTargetPropertyType.id,
            data,
        )
        setEditTargetPropertyType(null)
        await loadProperties()
    }

    return (
        <>
            <Button className='mt-4' onClick={() => setFormShow(true)}>
                Добавить свойство
            </Button>

            <h4 className='mt-6 mb-3 border-b pb-1 text-xl font-semibold'>
                Свойства объекта
            </h4>

            <LoadEffect
                data={objectProperties}
                contentSize={{ height: '20px', width: '100%' }}
            >
                {objectProperties?.length == 0 ? (
                    <span className='text-muted-foreground'>Нет свойств</span>
                ) : (
                    <DefaultList
                        data={objectProperties ? objectProperties : []}
                        renderItem={renderProperty}
                        onViewRequest={handleViewRequest}
                        onChangeRequest={handleChangeRequest}
                        onDeleteRequest={handleDeleteRequest}
                    />
                )}
            </LoadEffect>

            <h4 className='mt-6 mb-3 border-b pb-1 text-xl font-semibold'>
                Свойства экземпляра
            </h4>

            <LoadEffect
                data={instanceProperties}
                contentSize={{ height: '20px', width: '100%' }}
            >
                {instanceProperties?.length == 0 ? (
                    <span className='text-muted-foreground'>Нет свойств</span>
                ) : (
                    <DefaultList
                        data={instanceProperties ? instanceProperties : []}
                        renderItem={renderProperty}
                        onViewRequest={handleViewRequest}
                        onChangeRequest={handleChangeRequest}
                        onDeleteRequest={handleDeleteRequest}
                    />
                )}
            </LoadEffect>

            {formShow && (
                <AddEntityForm
                    schema={propertyTypeSchema}
                    uiSchema={propertyTypeUiSchema}
                    context={{
                        objectTypeId: objectType.id,
                        defaultIsStatic: true,
                    }}
                    defaults={{ name: '' }}
                    title='Добавление нового свойства'
                    submitCallback={confirmAddProperty}
                />
            )}
            {editTargetPropertyType && (
                <EditEntityForm
                    schema={propertyTypeSchema}
                    uiSchema={propertyTypeUiSchema}
                    context={{
                        objectTypeId: editTargetPropertyType.type_id,
                        defaultIsStatic: editTargetPropertyType.is_static,
                    }}
                    source={editTargetPropertyType}
                    title={`Изменение свойства "${editTargetPropertyType.name}"`}
                    submitCallback={confirmEditPropertyType}
                />
            )}
            {viewTargetPropertyType && (
                <ViewEntityModal
                    uiSchema={propertyTypeUiSchema}
                    context={{
                        objectTypeId: viewTargetPropertyType.type_id,
                        defaultIsStatic: viewTargetPropertyType.is_static,
                    }}
                    source={viewTargetPropertyType}
                    title={`Просмотр свойства "${viewTargetPropertyType.name}"`}
                    onClose={() => setViewTargetPropertyType(null)}
                />
            )}
        </>
    )
}

export default TypePropertiesTab
