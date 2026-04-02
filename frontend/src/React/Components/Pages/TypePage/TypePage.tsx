import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import LoadEffect from '@Components/Common/LoadEffect.tsx'
import ModeAwareIconLabel from '@Components/Common/ModeAwareIconLabel.tsx'
import PublicIcon from '@Components/Common/PublicIcon.tsx'
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
import type { ObjectType } from '@Schemas'
import { useServicesStore } from '@StorageImpl'
import TypeEventTypesTab from './TypeEventTypesTab.tsx'
import TypeMainInfo from './TypeMainInfo.tsx'
import TypeObjectsTab from './TypeObjectsTab.tsx'
import TypePropertiesTab from './TypePropertiesTab.tsx'
import TypeTreeView from './TypeTreeView.tsx'

function TypePage() {
    const { typeId } = useParams()
    const navigate = useNavigate()

    const services = useServicesStore(state => state.services)

    const id: number = Number(typeId)

    const [objectType, setObjectType] = useState<ObjectType | null>(null)

    useEffect(() => {
        async function loadObjectType() {
            setObjectType(null)
            if (isNaN(id)) {
                navigate('/404')
                return
            }

            try {
                setObjectType(await services.objectsTypesService.read(id))
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: m => alert(m),
                })
            }
        }
        loadObjectType()
    }, [navigate, services.objectsTypesService, id, typeId])

    return (
        <div className='mx-auto mt-4 w-full max-w-7xl px-4'>
            <div className='mb-3'>
                <Breadcrumb>
                    <BreadcrumbList>
                        <LoadEffect
                            data={objectType}
                            contentSize={{ height: '20px', width: '100%' }}
                        >
                            <BreadcrumbItem>
                                <BreadcrumbLink to='/'>Главная</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>
                                    {objectType?.name}
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </LoadEffect>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <LoadEffect
                data={objectType}
                contentSize={{ height: '20px', width: '100%' }}
            >
                <h1 className='mb-6 text-center text-3xl font-semibold'>
                    Тип "{objectType?.name}"
                </h1>

                {objectType && <TypeMainInfo objectType={objectType} />}
            </LoadEffect>

            <Tabs defaultValue='instances' className='mb-4'>
                <TabsList className='grid h-auto w-full grid-cols-4'>
                    <TabsTrigger value='instances'>
                        <ModeAwareIconLabel
                            icon={
                                <PublicIcon
                                    src='/objects.svg'
                                    className='size-4'
                                />
                            }
                            label='Объекты'
                        />
                    </TabsTrigger>
                    <TabsTrigger value='properties'>
                        <ModeAwareIconLabel
                            icon={
                                <PublicIcon
                                    src='/properties.svg'
                                    className='size-4'
                                />
                            }
                            label='Свойства'
                        />
                    </TabsTrigger>
                    <TabsTrigger value='event-types'>
                        <ModeAwareIconLabel
                            icon={
                                <PublicIcon
                                    src='/events.svg'
                                    className='size-4'
                                />
                            }
                            label='Типы событий'
                        />
                    </TabsTrigger>
                    <TabsTrigger value='structure'>
                        <ModeAwareIconLabel
                            icon={
                                <PublicIcon
                                    src='/structure.svg'
                                    className='size-4'
                                />
                            }
                            label='Структура'
                        />
                    </TabsTrigger>
                </TabsList>

                <TabsContent value='instances'>
                    {objectType && <TypeObjectsTab objectType={objectType} />}
                </TabsContent>
                <TabsContent value='properties'>
                    {objectType && (
                        <TypePropertiesTab objectType={objectType} />
                    )}
                </TabsContent>
                <TabsContent value='event-types'>
                    {objectType && (
                        <TypeEventTypesTab objectType={objectType} />
                    )}
                </TabsContent>
                <TabsContent value='structure'>
                    {objectType && <TypeTreeView objectType={objectType} />}
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default TypePage
