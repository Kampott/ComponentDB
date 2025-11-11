import { type ReactNode, useEffect, useState } from 'react'

import { RestApiError } from '@/Http/RestApiClient.ts'
import type { Object } from '@/Schemas/Object.ts'
import type { ObjectInstance } from '@/Schemas/ObjectInstance.ts'
import { useServicesStore } from '@/Storages/Zustand/ServicesStore.ts'
import { handleApiError } from '@/Utility/handle_api_error.ts'
import { useNavigate } from 'react-router-dom'
import DefaultList from '../../Common/DefaultList.tsx'
import LoadEffect from '../../Common/LoadEffect.tsx'

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
