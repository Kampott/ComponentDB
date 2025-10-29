import { type ReactNode, useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { RestApiError } from '@/Http/RestApiClient.ts'
import type { Object } from '@/Schemas/Object.ts'
import type { ObjectType } from '@/Schemas/ObjectType.ts'
import { useServicesStore } from '@/Storages/Zustand.ts'
import { handleApiError } from '@/Utility/handle_api_error.ts'
import { toString } from '@/Utility/to_string.ts'
import DefaultList from '../../Common/DefaultList.tsx'
import LoadEffect from '../../Common/LoadEffect.tsx'

interface Props {
    objectType: ObjectType
}

function TypeObjectsTab({ objectType }: Props): ReactNode {
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [objects, setObjects] = useState<Object[] | null>(null)

    useEffect(() => {
        async function loadObjects(): Promise<void> {
            setObjects(null)
            try {
                setObjects(
                    await services.objectService.getObjectsByTypeId(
                        objectType.id,
                    ),
                )
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: m => alert(m),
                })
            }
        }

        loadObjects()
    }, [navigate, services.objectService, objectType])

    function renderObject(object: Object): ReactNode {
        return <>{toString(object)}</>
    }

    function navigateToObjectPage(object: Object): void {
        navigate(`/objects/${object.id}`)
    }

    return (
        <>
            <LoadEffect
                data={objects}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DefaultList
                    data={objects ? objects : []}
                    onClick={navigateToObjectPage}
                    renderItem={renderObject}
                />
            </LoadEffect>
        </>
    )
}

export default TypeObjectsTab
