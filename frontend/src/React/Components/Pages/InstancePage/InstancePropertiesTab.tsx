import { type ReactNode, useEffect, useState } from 'react'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { Input } from '@Components/ui/input'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type {
    ObjectInstance,
    Property,
    PropertyAdd,
    PropertyType,
} from '@Schemas'
import { useServicesStore } from '@StorageImpl'

interface InstanceProperty {
    type: PropertyType
    value: string | null
}

interface Props {
    instance: ObjectInstance
}

function EditableInstancePropertyRow({
    property,
    onUpdate,
}: {
    property: InstanceProperty
    onUpdate: (property: InstanceProperty) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(property.value || '')

    const handleDoubleClick = () => {
        setEditValue(property.value || '')
        setIsEditing(true)
    }

    const commit = () => {
        setIsEditing(false)
        onUpdate({ ...property, value: editValue })
    }

    return (
        <div className='grid w-full grid-cols-2 gap-3'>
            <div className='text-sm'>{property.type.name}</div>
            <div className='text-sm' onDoubleClick={handleDoubleClick}>
                {isEditing ? (
                    <Input
                        type='text'
                        value={editValue}
                        autoFocus
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                commit()
                            }
                        }}
                        onBlur={commit}
                        placeholder='Введите значение'
                    />
                ) : (
                    property.value || 'Свойство не задано'
                )}
            </div>
        </div>
    )
}

function InstancePropertiesTab({ instance }: Props): ReactNode {
    const services = useServicesStore(state => state.services)

    const [instanceProperties, setInstanceProperties] = useState<
        InstanceProperty[] | null
    >(null)

    async function updateProperty(updatedProp: InstanceProperty) {
        setInstanceProperties(prev =>
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
                object_id: instance.id,
                value: updatedProp.value,
            }
            await services.propertiesService.create(payload)
        } else {
            console.log('Something went wrong after value update')
        }
    }

    useEffect(() => {
        async function loadProperties(): Promise<void> {
            setInstanceProperties(null)

            try {
                const object = await services.objectService.read(
                    instance.object_id,
                )
                const propertiesTypes: PropertyType[] =
                    await services.propertiesTypesService.getPropertyTypesByTypeId(
                        object.type_id,
                        false,
                    )
                const propertiesValues: Property[] =
                    await services.propertiesService.getPropertiesByInstanceId(
                        instance.id,
                    )

                setInstanceProperties(
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
                        } as InstanceProperty
                    }),
                )
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        loadProperties()
    }, [
        instance,
        services.objectService,
        services.propertiesService,
        services.propertiesTypesService,
    ])

    function renderInstanceProperty(property: InstanceProperty): ReactNode {
        return (
            <EditableInstancePropertyRow
                property={property}
                onUpdate={updateProperty}
            />
        )
    }

    return (
        <>
            <LoadEffect
                data={instanceProperties}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DefaultList
                    data={instanceProperties ? instanceProperties : []}
                    renderItem={renderInstanceProperty}
                />
            </LoadEffect>
        </>
    )
}

export default InstancePropertiesTab
