import {type ReactNode, useEffect, useState} from "react";

import type {ObjectInstance} from "../../../schemas/ObjectInstance.ts";
import {useStore} from "../../../store/Zustand.ts";
import Button from "react-bootstrap/Button";
import DefaultList from "../../Common/DefaultList.tsx";
import {useNavigate} from "react-router-dom";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {Object} from "../../../schemas/Object.ts";

interface Props {
    object: Object;
}

function ObjectInstancesTab({object}: Props): ReactNode {
    const navigate = useNavigate();

    const services = useStore((state) => state.services);

    const [objectInstances, setObjectInstances] = useState<ObjectInstance[] | null>(null);

    async function loadInstances(): Promise<void> {
        setObjectInstances(await services.objectsInstancesService.getInstancesByObjectId(object.id));
    }

    useEffect(() => {
        loadInstances();
    }, [])

    function renderInstance(instance: ObjectInstance): ReactNode {
        return (
            <>ID: {instance.id}</>
        );
    }

    function navigateToInstancePage(instance: ObjectInstance): void {
        navigate(`/instances/${instance.id}`);
    }

    return (
        <>
            <Button variant="primary" className="mt-4">Добавить экземпляр</Button>
            <LoadEffect data={objectInstances} contentSize={{height: "20px", width: "100%"}}>
                <DefaultList data={objectInstances ? objectInstances : []}
                             onClick={navigateToInstancePage}
                             renderItem={renderInstance}
                />
            </LoadEffect>
        </>
    );
}

export default ObjectInstancesTab;