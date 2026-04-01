import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { toString } from '@/Utility/to_string.ts'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@Components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@Components/ui/tabs'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { ObjectInstance } from '@Schemas'
import { useServicesStore } from '@StorageImpl'
import InstanceDocumentsTab from './InstanceDocumentsTab.tsx'
import InstanceEventsTab from './InstanceEventsTab.tsx'
import InstanceMainInfo from './InstanceMainInfo.tsx'
import InstancePropertiesTab from './InstancePropertiesTab.tsx'
import InstanceTreeView from './InstanceTreeView.tsx'

function InstancePage() {
    const { instanceId } = useParams()
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [instance, setInstance] = useState<ObjectInstance | null>(null)

    const id: number = Number(instanceId)

    useEffect(() => {
        async function loadObjectInstance() {
            setInstance(null)

            if (isNaN(id)) {
                navigate('/404')
                return
            }

            try {
                setInstance(await services.objectsInstancesService.read(id))
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: m => alert(m),
                })
            }
        }

        loadObjectInstance()
    }, [services.objectsInstancesService, id, navigate, instanceId])

    return (
        <div className='mx-auto mt-4 w-full max-w-7xl px-4'>
            <div className='mb-3'>
                <Breadcrumb>
                    <BreadcrumbList>
                        <LoadEffect
                            data={instance}
                            contentSize={{ height: '20px', width: '100%' }}
                        >
                            <BreadcrumbItem>
                                <BreadcrumbLink to='/'>Главная</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{instance?.id}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </LoadEffect>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <LoadEffect
                data={instance}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <h1 className='mb-6 text-center text-3xl font-semibold'>
                    Экземпляр "{toString(instance)}"
                </h1>

                {instance && <InstanceMainInfo instance={instance} />}
            </LoadEffect>

            <Tabs defaultValue='instances' className='mb-4'>
                <TabsList className='grid h-auto w-full grid-cols-4'>
                    <TabsTrigger value='instances'>События</TabsTrigger>
                    <TabsTrigger value='properties'>Свойства</TabsTrigger>
                    <TabsTrigger value='documents'>Документы</TabsTrigger>
                    <TabsTrigger value='structure'>Структура</TabsTrigger>
                </TabsList>

                <TabsContent value='instances'>
                    {instance && <InstanceEventsTab instance={instance} />}
                </TabsContent>
                <TabsContent value='properties'>
                    {instance && <InstancePropertiesTab instance={instance} />}
                </TabsContent>
                <TabsContent value='documents'>
                    {instance && <InstanceDocumentsTab instance={instance} />}
                </TabsContent>
                <TabsContent value='structure'>
                    {instance && <InstanceTreeView instance={instance} />}
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default InstancePage
