import { Bookmark, Boxes } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object, ObjectInstance, ObjectType } from '@Schemas'
import { useServicesStore, useToastStore } from '@StorageImpl'
import { Link } from 'react-router-dom'

interface Props {
    object: Object
}

function ObjectMainInfo({ object }: Props): ReactNode {
    const services = useServicesStore(state => state.services)

    const [rootObject, setRootObject] = useState<Object | null>(null)
    const [objectType, setObjectType] = useState<ObjectType | null>(null)

    const addToast = useToastStore(state => state.addToast)

    useEffect(() => {
        async function loadRootObject() {
            setRootObject(null)
            try {
                const rootObject: Object = await services.objectService.read(
                    object.root_id,
                )
                setRootObject(rootObject)
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        async function loadObjectType() {
            setObjectType(null)
            try {
                setObjectType(
                    await services.objectsTypesService.read(object.type_id),
                )
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        loadRootObject()
        loadObjectType()
    }, [services.objectService, services.objectsTypesService, object])

    async function createObjectInstance() {
        try {
            const instance: ObjectInstance =
                await services.objectService.createInstance(object.id)
            addToast('Экземпляр добавлен', `id ${instance.id}`)
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }

    return (
        <div className='mb-4'>
            <Card className='border'>
                <CardContent className='space-y-3'>
                    <div className='grid gap-3 md:grid-cols-2'>
                        <div className='flex items-center gap-3 rounded-lg border p-3'>
                            <Bookmark className='text-primary size-5' />
                            <div>
                                <div className='text-muted-foreground text-sm'>
                                    Корневой объект
                                </div>
                                <LoadEffect
                                    data={rootObject}
                                    contentSize={{
                                        width: '120px',
                                        height: '16px',
                                    }}
                                >
                                    <Link
                                        to={`/objects/${rootObject?.id}`}
                                        className='font-semibold hover:underline'
                                    >
                                        {rootObject?.name}
                                    </Link>
                                </LoadEffect>
                            </div>
                        </div>

                        <div className='flex items-center gap-3 rounded-lg border p-3'>
                            <Boxes className='text-primary size-5' />
                            <div>
                                <div className='text-muted-foreground text-sm'>
                                    Тип
                                </div>
                                <LoadEffect
                                    data={objectType}
                                    contentSize={{
                                        width: '120px',
                                        height: '16px',
                                    }}
                                >
                                    <Link
                                        to={`/types/${objectType?.id}`}
                                        className='font-semibold hover:underline'
                                    >
                                        {objectType?.name}
                                    </Link>
                                </LoadEffect>
                            </div>
                        </div>
                    </div>

                    {object.parent_id == null && (
                        <div>
                            <Button onClick={() => createObjectInstance()}>
                                Добавить экземпляр
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default ObjectMainInfo
