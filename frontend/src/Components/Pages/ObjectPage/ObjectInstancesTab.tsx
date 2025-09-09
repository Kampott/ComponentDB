import {type ReactNode, useEffect, useState} from "react";

import type {ObjectInstance} from "../../../schemas/ObjectInstance.ts";
import {useStore} from "../../../store/Zustand.ts";
import DefaultList from "../../Common/DefaultList.tsx";
import {useNavigate} from "react-router-dom";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {Object} from "../../../schemas/Object.ts";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";

interface Props {
    object: Object;
}

function ObjectInstancesTab({object}: Props): ReactNode {
    const navigate = useNavigate();

    const services = useStore((state) => state.services);

    const [objectInstances, setObjectInstances] = useState<ObjectInstance[] | null>(null);

    useEffect(() => {
        async function loadInstances(): Promise<void> {
            setObjectInstances(null);

            try {
                setObjectInstances(await services.objectsInstancesService.getInstancesByObjectId(object.id));
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: (m) => alert(m)
                });
            }
        }

        loadInstances();
    }, [navigate, services.objectsInstancesService, object])

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