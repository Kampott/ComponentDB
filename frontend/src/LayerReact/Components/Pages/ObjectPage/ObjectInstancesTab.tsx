import { type ReactNode, useEffect, useState } from 'react'

import DefaultList from '@Components/Common/DefaultList.tsx'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object, ObjectInstance } from '@RestSchemas'
import { useServicesStore } from '@StorageImpl'
import { useNavigate } from 'react-router-dom'

interface Props {
    object: Object
}

function ObjectInstancesTab({ object }: Props): ReactNode {
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [objectInstances, setObjectInstances] = useState<
        ObjectInstance[] | null
    >(null)

    useEffect(() => {
        async function loadInstances(): Promise<void> {
            setObjectInstances(null)

            try {
                setObjectInstances(
                    await services.objectsInstancesService.getInstancesByObjectId(
                        object.id,
                    ),
                )
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: m => alert(m),
                })
            }
        }

        loadInstances()
    }, [navigate, services.objectsInstancesService, object])

    function renderInstance(instance: ObjectInstance): ReactNode {
        return <>ID: {instance.id}</>
    }

    function navigateToInstancePage(instance: ObjectInstance): void {
        navigate(`/instances/${instance.id}`)
    }

    return (
        <>
            <LoadEffect
                data={objectInstances}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <DefaultList
                    data={objectInstances ? objectInstances : []}
                    onClick={navigateToInstancePage}
                    renderItem={renderInstance}
                />
            </LoadEffect>
        </>
    )
}

export default ObjectInstancesTab
