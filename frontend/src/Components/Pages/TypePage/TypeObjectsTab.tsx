import {type ReactNode, useEffect, useState} from "react";

import {useNavigate} from "react-router-dom";

import {useServicesStore} from "../../../stores/Zustand.ts";
import DefaultList from "../../Common/DefaultList.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import type {Object} from "../../../schemas/Object.ts";
import type {ObjectType} from "../../../schemas/ObjectType.ts";
import {toString} from "../../../utility/to_string.ts";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";

interface Props {
    objectType: ObjectType;
}

function TypeObjectsTab({objectType}: Props): ReactNode {
    const navigate = useNavigate();

    const services = useServicesStore((state) => state.services);

    const [objects, setObjects] = useState<Object[] | null>(null);

    useEffect(() => {
        async function loadObjects(): Promise<void> {
            setObjects(null);
            try {
                setObjects(await services.objectService.getObjectsByTypeId(objectType.id));
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: (m) => alert(m)
                });
            }
        }

        loadObjects();
    }, [navigate, services.objectService, objectType])

    function renderObject(object: Object): ReactNode {
        return (
            <>{toString(object)}</>
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
