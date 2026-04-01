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
import type { Object } from '@Schemas'
import { useServicesStore } from '@StorageImpl'
import ObjectDocumentsTab from './ObjectDocumentsTab.tsx'
import ObjectInstancesTab from './ObjectInstancesTab.tsx'
import ObjectMainInfo from './ObjectMainInfo.tsx'
import ObjectPropertiesTab from './ObjectPropertiesTab.tsx'
import ObjectTreeView from './ObjectTreeView.tsx'

function ObjectPage() {
    const { objectId } = useParams()
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const [object, setObject] = useState<Object | null>(null)

    const id: number = Number(objectId)

    useEffect(() => {
        async function loadObject() {
            setObject(null)

            if (isNaN(id)) {
                navigate('/404')
                return
            }

            try {
                setObject(await services.objectService.read(id))
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: m => alert(m),
                })
            }
        }

        loadObject()
    }, [services.objectService, id, navigate, objectId])

    return (
        <div className='mx-auto mt-4 w-full max-w-7xl px-4'>
            <div className='mb-3'>
                <Breadcrumb>
                    <BreadcrumbList>
                        <LoadEffect
                            data={object}
                            contentSize={{ height: '20px', width: '100%' }}
                        >
                            <BreadcrumbItem>
                                <BreadcrumbLink to='/'>Главная</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{object?.id}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </LoadEffect>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <LoadEffect
                data={object}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <h1 className='mb-6 text-center text-3xl font-semibold'>
                    Объект "{toString(object)}"
                </h1>

                {object && <ObjectMainInfo object={object} />}
            </LoadEffect>

            <Tabs defaultValue='instances' className='mb-4'>
                <TabsList className='grid h-auto w-full grid-cols-4'>
                    <TabsTrigger value='instances'>Экземпляры</TabsTrigger>
                    <TabsTrigger value='properties'>Свойства</TabsTrigger>
                    <TabsTrigger value='documents'>Документы</TabsTrigger>
                    <TabsTrigger value='structure'>Структура</TabsTrigger>
                </TabsList>

                <TabsContent value='instances'>
                    {object && <ObjectInstancesTab object={object} />}
                </TabsContent>
                <TabsContent value='properties'>
                    {object && <ObjectPropertiesTab object={object} />}
                </TabsContent>
                <TabsContent value='documents'>
                    {object && <ObjectDocumentsTab object={object} />}
                </TabsContent>
                <TabsContent value='structure'>
                    {object && <ObjectTreeView object={object} />}
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default ObjectPage
