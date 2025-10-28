import {type ReactNode, useEffect, useState} from "react";

import Form from "react-bootstrap/Form";

import {useServicesStore} from "../../../stores/Zustand.ts";
import DefaultList from "../../Common/DefaultList.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {PropertyType} from "../../../schemas/PropertyType.ts";
import type {Property} from "../../../schemas/Property.ts";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import type {ObjectInstance} from "../../../schemas/ObjectInstance.ts";

interface InstanceProperty {
    type: PropertyType;
    value: string | null;
}

interface Props {
    instance: ObjectInstance;
}

function InstancePropertiesTab({instance}: Props): ReactNode {
    const services = useServicesStore((state) => state.services);

    const [instanceProperties, setInstanceProperties] = useState<InstanceProperty[] | null>(null);

    async function updateProperty(updatedProp: InstanceProperty) {
        setInstanceProperties(prev =>
            prev ? prev.map(prop => {
                return prop.type.name === updatedProp.type.name ? updatedProp : prop
            }) : prev
        );

        if (updatedProp.value) {
            await services.propertiesService.addProperty({
                property_id: updatedProp.type.id,
                object_id: instance.id,
                value: updatedProp.value
            })
        } else {
            console.log("Something went wrong after value update");
        }
    }

    useEffect(() => {
        async function loadProperties(): Promise<void> {
            setInstanceProperties(null);

            try {
                const object = await services.objectService.getObjectById(instance.object_id);
                const propertiesTypes: PropertyType[] = await services.propertiesTypesService.getPropertyTypesByTypeId(object.type_id, false);
                const propertiesValues: Property[] = await services.propertiesService.getPropertiesByInstanceId(instance.id);

                setInstanceProperties(propertiesTypes.map(propertyType => {
                    let value: string | null = null;
                    for (const propertyValue of propertiesValues) {
                        if (propertyValue.property_id == propertyType.id) {
                            value = propertyValue.value;
                            break;
                        }
                    }
                    return {type: propertyType, value: value} as InstanceProperty;
                }));
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m) => alert(m)
                });
            }
        }

        loadProperties();
    }, [instance, services.objectService, services.propertiesService, services.propertiesTypesService])

    function RenderInstanceProperty(property: InstanceProperty): ReactNode {
        const [isEditing, setIsEditing] = useState(false);
        const [editValue, setEditValue] = useState(property.value || "");

        const handleDoubleClick = () => {
            setEditValue(property.value || "");
            setIsEditing(true);
        };

        const handleKeyDown = (key: string) => {
            if (key === "Enter") {
                setIsEditing(false);
                property.value = editValue;
                updateProperty(property);
            }
        };

        return (
            <>
                <div className="w-50 text-start">{property.type.name}</div>
                <div className="w-50 text-start" onDoubleClick={handleDoubleClick}>
                    {isEditing ? (
                        <Form.Control
                            type="text"
                            value={editValue}
                            autoFocus
                            size="sm" // компактнее
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e.key)}
                            onBlur={() => setIsEditing(false)}
                            placeholder="Введите значение"
                        />
                    ) : (
                        property.value || "Свойство не задано"
                    )}
                </div>
            </>
        );
    }

    return (
        <>
            <LoadEffect data={instanceProperties} contentSize={{height: "20px", width: "100%"}}>
                <DefaultList data={instanceProperties ? instanceProperties : []}
                             onClick={null}
                             renderItem={RenderInstanceProperty}
                />
            </LoadEffect>
        </>
    );
}

export default InstancePropertiesTab;
