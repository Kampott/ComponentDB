import {type ReactNode, useEffect, useState} from "react";

import Button from "react-bootstrap/Button";
import {useNavigate} from "react-router-dom";

import {useStore} from "../../../../store/Zustand.ts";
import DefaultList from "../../../Common/DefaultList.tsx";
import LoadEffect from "../../../Common/LoadEffect.tsx";
import type {Object} from "../../../../schemas/Object.ts";
import type {ObjectType} from "../../../../schemas/ObjectType.ts";

interface Props {
    objectType: ObjectType;
}

function TypeObjectsTab({objectType}: Props): ReactNode {
    const navigate = useNavigate();

    const services = useStore((state) => state.services);

    const [objects, setObjects] = useState<Object[] | null>(null);

    async function loadObjects(): Promise<void> {
        setObjects(await services.objectService.getObjectsByTypeId(objectType.id));
    }

    useEffect(() => {
        setObjects(null);
        loadObjects();
    }, [objectType])

    function renderObject(object: Object): ReactNode {
        return (
            <>ID: {object.id}</>
        );
    }

    function navigateToObjectPage(object: Object): void {
        navigate(`/objects/${object.id}`);
    }

    return (
        <>
            <LoadEffect data={objects} contentSize={{height: "20px", width: "100%"}}>
                <DefaultList data={objects ? objects : []}
                             onClick={navigateToObjectPage}
                             renderItem={renderObject}
                />
            </LoadEffect>
        </>
    );
}

export default TypeObjectsTab;
