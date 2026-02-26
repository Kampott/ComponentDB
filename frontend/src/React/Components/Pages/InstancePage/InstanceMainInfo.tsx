import { Bookmark, Boxes } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object, ObjectInstance } from '@Schemas'
import { useServicesStore } from '@StorageImpl'
import { Link } from 'react-router-dom'

interface Props {
    instance: ObjectInstance
}

function InstanceMainInfo({ instance }: Props): ReactNode {
    const services = useServicesStore(state => state.services)

    const [parentInstance, setParentInstance] = useState<ObjectInstance | null>(
        null,
    )
    const [rootInstance, setRootInstance] = useState<ObjectInstance | null>(
        null,
    )
    const [obj, setObj] = useState<Object | null>(null)

    useEffect(() => {
        async function loadParentInstance() {
            if (!instance.parent_id) {
                return
            }

            setParentInstance(null)
            try {
                const parentInstance: ObjectInstance =
                    await services.objectsInstancesService.read(
                        instance.parent_id,
                    )
                setParentInstance(parentInstance)
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        async function loadRootInstance() {
            setRootInstance(null)
            try {
                const rootInstance: ObjectInstance =
                    await services.objectsInstancesService.read(
                        instance.root_id,
                    )
                setRootInstance(rootInstance)
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        async function loadObject() {
            setObj(null)
            try {
                const obj: Object = await services.objectService.read(
                    instance.object_id,
                )
                setObj(obj)
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m: string) => alert(m),
                })
            }
        }

        loadParentInstance()
        loadRootInstance()
        loadObject()
    }, [services.objectService, services.objectsInstancesService, instance])

    return (
        <div className='mb-4'>
            <Card className='border'>
                <CardContent className='space-y-3'>
                    <div className='grid gap-3 md:grid-cols-2'>
                        <div className='flex items-center gap-3 rounded-lg border p-3'>
                            <Bookmark className='text-primary size-5' />
                            <div>
                                <div className='text-muted-foreground text-sm'>
                                    Родитель
                                </div>
                                <LoadEffect
                                    data={parentInstance}
                                    contentSize={{
                                        width: '120px',
                                        height: '16px',
                                    }}
                                >
                                    <Link
                                        to={`/instances/${parentInstance?.id}`}
                                        className='font-semibold hover:underline'
                                    >
                                        {parentInstance?.name}
                                    </Link>
                                </LoadEffect>
                            </div>
                        </div>

                        <div className='flex items-center gap-3 rounded-lg border p-3'>
                            <Bookmark className='text-primary size-5' />
                            <div>
                                <div className='text-muted-foreground text-sm'>
                                    Корневой экземпляр
                                </div>
                                <LoadEffect
                                    data={rootInstance}
                                    contentSize={{
                                        width: '120px',
                                        height: '16px',
                                    }}
                                >
                                    <Link
                                        to={`/instances/${rootInstance?.id}`}
                                        className='font-semibold hover:underline'
                                    >
                                        {rootInstance?.name}
                                    </Link>
                                </LoadEffect>
                            </div>
                        </div>

                        <div className='flex items-center gap-3 rounded-lg border p-3'>
                            <Boxes className='text-primary size-5' />
                            <div>
                                <div className='text-muted-foreground text-sm'>
                                    Объект
                                </div>
                                <LoadEffect
                                    data={obj}
                                    contentSize={{
                                        width: '120px',
                                        height: '16px',
                                    }}
                                >
                                    <Link
                                        to={`/objects/${obj?.id}`}
                                        className='font-semibold hover:underline'
                                    >
                                        {obj?.name}
                                    </Link>
                                </LoadEffect>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default InstanceMainInfo
