import {type ReactNode, useEffect, useState} from "react";

import {useStore} from "../../../store/Zustand.ts";
import DefaultList from "../../Common/DefaultList.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {Object} from "../../../schemas/Object.ts";
import type {PropertyType} from "../../../schemas/PropertyType.ts";
import type {Property} from "../../../schemas/Property.ts";

interface ObjectProperty {
    name: string;
    value: string | null;
}

interface Props {
    object: Object;
}

function ObjectPropertiesTab({object}: Props): ReactNode {
    const services = useStore((state) => state.services);

    const [objectProperties, setObjectProperties] = useState<ObjectProperty[] | null>(null);

    async function loadProperties(): Promise<void> {
        const propertiesTypes: PropertyType[] = await services.propertiesTypesService.getPropertyTypesByTypeId(object.type_id, true);
        const propertiesValues: Property[] = await services.propertiesService.getPropertiesByObjectId(object.id);

        setObjectProperties(propertiesTypes.map(propertyType => {
            let value: string | null = null;
            for (const propertyValue of propertiesValues) {
                if (propertyValue.property_id == propertyType.id) {
                    value = propertyValue.value;
                    break;
                }
            }
            return {name: propertyType.name, value: value} as ObjectProperty;
        }));
    }

    useEffect(() => {
        loadProperties();
    }, [])

    function renderObjectProperty(property: ObjectProperty): ReactNode {
        return (
            <>
                <div className="w-50 text-start">{property.name}</div>
                <div className="w-50 text-start">{property.value ? property.value : "Свойство не задано"}</div>
            </>
        );
    }

    return (
        <>
            <LoadEffect data={objectProperties} contentSize={{height: "20px", width: "100%"}}>
                <DefaultList data={objectProperties ? objectProperties : []}
                             onClick={null}
                             renderItem={renderObjectProperty}
                />
            </LoadEffect>
        </>
    );
}

export default ObjectPropertiesTab;
