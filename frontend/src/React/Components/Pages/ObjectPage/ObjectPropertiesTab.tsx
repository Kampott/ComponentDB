import { type ReactNode, useEffect, useState } from 'react'

import Form from 'react-bootstrap/Form'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object, Property, PropertyAdd, PropertyType } from '@Schemas'
import { useServicesStore } from '@StorageImpl'

interface ObjectProperty {
    type: PropertyType
    value: string | null
}

interface Props {
    object: Object
}

function ObjectPropertiesTab({ object }: Props): ReactNode {
    const services = useServicesStore(state => state.services)

    const [objectProperties, setObjectProperties] = useState<
        ObjectProperty[] | null
    >(null)

    async function updateProperty(updatedProp: ObjectProperty) {
        setObjectProperties(prev =>
            prev
                ? prev.map(prop => {
                      return prop.type.name === updatedProp.type.name
                          ? updatedProp
                          : prop
                  })
                : prev,
        )

        if (updatedProp.value) {
            const payload: PropertyAdd = {
                property_id: updatedProp.type.id,
                object_id: object.id,
                value: updatedProp.value,
            }
            await services.propertiesService.create(payload)
        } else {
            console.log('Something went wrong after value update')
        }
    }

    useEffect(() => {
        async function loadProperties(): Promise<void> {
            setObjectProperties(null)

            try {
                const propertiesTypes: PropertyType[] =
                    await services.propertiesTypesService.getPropertyTypesByTypeId(
                        object.type_id,
                        true,
                    )
                const propertiesValues: Property[] =
                    await services.propertiesService.getPropertiesByObjectId(
                        object.id,
                    )

                setObjectProperties(
                    propertiesTypes.map(propertyType => {
                        let value: string | null = null
                        for (const propertyValue of propertiesValues) {
                            if (propertyValue.property_id == propertyType.id) {
                                value = propertyValue.value
                                break
                            }
                        }
                        return {
                            type: propertyType,
                            value: value,
                        } as ObjectProperty
                    }),
                )
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        loadProperties()
    }, [object])

    function RenderObjectProperty(property: ObjectProperty): ReactNode {
        const [isEditing, setIsEditing] = useState(false)
        const [editValue, setEditValue] = useState(property.value || '')

        const handleDoubleClick = () => {
            setEditValue(property.value || '')
            setIsEditing(true)
        }

        const handleKeyDown = (key: string) => {
            if (key === 'Enter') {
                setIsEditing(false)
                property.value = editValue
                updateProperty(property)
            }
        }

        return (
            <>
                <div className='w-50 text-start'>{property.type.name}</div>
                <div
                    className='w-50 text-start'
                    onDoubleClick={handleDoubleClick}
                >
                    {isEditing ? (
                        <Form.Control
                            type='text'
                            value={editValue}
                            autoFocus
                            size='sm' // компактнее
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => handleKeyDown(e.key)}
                            onBlur={() => setIsEditing(false)}
                            placeholder='Введите значение'
                        />
                    ) : (
                        property.value || 'Свойство не задано'
                    )}
                </div>
            </>
        )
    }

    return (
        <>
            <LoadEffect
                data={objectProperties}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DefaultList
                    data={objectProperties ? objectProperties : []}
                    renderItem={RenderObjectProperty}
                />
            </LoadEffect>
        </>
    )
}

export default ObjectPropertiesTab
