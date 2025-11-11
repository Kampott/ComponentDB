import { type ReactNode, useEffect, useState } from 'react'

import Button from 'react-bootstrap/Button'

import { RestApiError } from '@/Http/RestApiClient.ts'
import type { ObjectType } from '@/Schemas/ObjectType.ts'
import type { PropertyType, PropertyTypeAdd } from '@/Schemas/PropertyType.ts'
import { useServicesStore } from '@/Storages/Zustand/ServicesStore.ts'
import { handleApiError } from '@/Utility/handle_api_error.ts'
import DefaultList from '../../Common/DefaultList.tsx'
import LoadEffect from '../../Common/LoadEffect.tsx'
import AddTypePropertyForm from '../../Forms/AddTypePropertyForm.tsx'

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
        return (
            <>
                {/*<div className="w-50 text-start">{property.name}</div>*/}
                {property.name}
            </>
        )
    }

    async function confirmAddProperty(data: PropertyTypeAdd | null) {
        if (!data) {
            setFormShow(false)
            return
        }

        try {
            await services.propertiesTypesService.addPropertyType(data)
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
        console.log(propertyType)
    }

    function handleDeleteRequest(propertyType: PropertyType) {
        console.log(propertyType)
    }

    return (
        <>
            <Button
                variant='primary'
                className='mt-4'
                onClick={() => setFormShow(true)}
            >
                Добавить свойство
            </Button>

            <h4 className='fw-semibold fs-4 border-bottom pb-1 mb-3 pt-5'>
                Свойства объекта
            </h4>

            <LoadEffect
                data={objectProperties}
                contentSize={{ height: '20px', width: '100%' }}
            >
                {objectProperties?.length == 0 ? (
                    'Нет свойств'
                ) : (
                    <DefaultList
                        data={objectProperties ? objectProperties : []}
                        renderItem={renderProperty}
                        onChangeRequest={handleChangeRequest}
                        onDeleteRequest={handleDeleteRequest}
                    />
                )}
            </LoadEffect>

            <h4 className='fw-semibold fs-4 border-bottom pb-1 mb-3 pt-5'>
                Свойства экземпляра
            </h4>

            <LoadEffect
                data={instanceProperties}
                contentSize={{ height: '20px', width: '100%' }}
            >
                {instanceProperties?.length == 0 ? (
                    'Нет свойств'
                ) : (
                    <DefaultList
                        data={instanceProperties ? instanceProperties : []}
                        renderItem={renderProperty}
                        onChangeRequest={handleChangeRequest}
                        onDeleteRequest={handleDeleteRequest}
                    />
                )}
            </LoadEffect>

            {formShow && (
                <AddTypePropertyForm
                    objectType={objectType}
                    submitCallback={confirmAddProperty}
                />
            )}
        </>
    )
}

export default TypePropertiesTab
