import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import type {ObjectType} from "../../../schemas/ObjectType.ts";
import {useStore} from "../../../store/Zustand.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import LoadEffect from "../../Common/LoadEffect.tsx";

function TypePage() {
    const {typeId} = useParams();
    const navigate = useNavigate();

    const services = useStore((state) => state.services)

    const id: number = Number(typeId)

    const [objectType, setObjectType] = useState<ObjectType | null>(null);

    async function loadObjectType() {
        if (isNaN(id)) {
            navigate("/404")
            return
        }

        try {
            setObjectType(await services.objectsTypesService.getTypeById(id))
        } catch (error) {
            if (error instanceof RestApiError) {
                const apiError: RestApiError = error as RestApiError
                if (apiError.statusCode && apiError.statusCode == 404) {
                    navigate("/404")
                    return
                }
            }
            if (error instanceof Error) {
                console.log(error)
            }
        }
    }

    useEffect(() => {
        loadObjectType()
    }, [])

    return (
        <LoadEffect data={objectType} contentSize={{height: "20px", width: "100%"}}>
            {objectType?.name}
        </LoadEffect>

    )
}

export default TypePage;