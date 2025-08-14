import {type ReactNode, useEffect, useState} from "react";

import Button from "react-bootstrap/Button";

import {useStore} from "../../../store/Zustand.ts";
import DefaultList from "../../Common/DefaultList.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {PropertyType} from "../../../schemas/PropertyType.ts";
import type {ObjectType} from "../../../schemas/ObjectType.ts";

interface Props {
    objectType: ObjectType;
}

function TypePropertiesTab({objectType}: Props): ReactNode {
    const services = useStore((state) => state.services);

    const [objectProperties, setObjectProperties] = useState<PropertyType[] | null>(null);
    const [instanceProperties, setInstanceProperties] = useState<PropertyType[] | null>(null);

    async function loadProperties(): Promise<void> {
        setObjectProperties(await services.propertiesTypesService.getPropertyTypesByTypeId(objectType.id, true));
        setInstanceProperties(await services.propertiesTypesService.getPropertyTypesByTypeId(objectType.id, false));
    }

    useEffect(() => {
        loadProperties();
    }, [])

    function renderProperty(property: PropertyType): ReactNode {
        return (
            <>
                {/*<div className="w-50 text-start">{property.name}</div>*/}
                {property.name}
            </>
        );
    }

    return (
        <>
            <Button variant="primary" className="mt-4">Добавить свойство</Button>

            <h4 className="fw-semibold fs-4 border-bottom pb-1 mb-3 pt-5">Свойства объекта</h4>

            <LoadEffect data={objectProperties} contentSize={{height: "20px", width: "100%"}}>
                {objectProperties?.length == 0 ? "Нет свойств" : <DefaultList data={objectProperties ? objectProperties : []}
                             onClick={null}
                             renderItem={renderProperty}
                />}
            </LoadEffect>

            <h4 className="fw-semibold fs-4 border-bottom pb-1 mb-3 pt-5">Свойства экземпляра</h4>

            <LoadEffect data={instanceProperties} contentSize={{height: "20px", width: "100%"}}>
                {instanceProperties?.length == 0 ? "Нет свойств" : <DefaultList data={instanceProperties ? instanceProperties : []}
                             onClick={null}
                             renderItem={renderProperty}
                />}
            </LoadEffect>
        </>
    );
}

export default TypePropertiesTab;
