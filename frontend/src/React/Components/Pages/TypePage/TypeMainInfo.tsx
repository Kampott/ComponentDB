import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { toString } from '@/Utility/to_string.ts'
import LoadEffect from '@Components/Common/LoadEffect.tsx'
import PublicIcon from '@Components/Common/PublicIcon.tsx'
import { Button } from '@Components/ui/button'
import { Card, CardContent } from '@Components/ui/card'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object, ObjectAdd, ObjectType } from '@Schemas'
import { useServicesStore } from '@StorageImpl'
import { Link } from 'react-router-dom'

interface Props {
    objectType: ObjectType
}

function TypeMainInfo({ objectType }: Props): ReactNode {
    const services = useServicesStore(state => state.services)

    const [rootObject, setRootObject] = useState<Object | null>(null)
    const [rootType, setRootType] = useState<ObjectType | null>(null)

    const loadRootObject = useCallback(async () => {
        setRootObject(null)
        try {
            const rootObjects: Object[] =
                await services.objectService.getObjectsByTypeId(objectType.id)
            if (rootObjects.length == 0) {
                return
            }
            if (rootObjects.length > 1) {
                console.log(
                    `У корневого типа ${objectType.id} каким-то образом больше 1 связанного объекта...`,
                )
            }

            setRootObject(rootObjects[0])
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: m => alert(m),
            })
        }
    }, [services.objectService, objectType])

    useEffect(() => {
        async function loadRootType() {
            setRootType(null)
            try {
                setRootType(
                    await services.objectsTypesService.read(objectType.root_id),
                )
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: m => alert(m),
                })
            }
        }

        if (objectType.parent_id == null) {
            loadRootObject()
        }
        loadRootType()
    }, [loadRootObject, services.objectsTypesService, objectType])

    async function addRootObject() {
        const payload: ObjectAdd = {
            name: objectType.name,
            type_id: objectType.id,
            parent_id: null,
        }

        await services.objectService.create(payload)

        await loadRootObject()
    }

    return (
        <div className='mb-4'>
            <Card className='border'>
                <CardContent className='space-y-3'>
                    <div className='grid gap-3 md:grid-cols-2'>
                        <div className='flex items-center gap-3 rounded-lg border p-3'>
                            <PublicIcon
                                src='/types.svg'
                                alt=''
                                className='size-5'
                            />
                            <div>
                                <div className='text-muted-foreground text-sm'>
                                    Корневой тип
                                </div>
                                <LoadEffect
                                    data={rootType}
                                    contentSize={{
                                        width: '120px',
                                        height: '16px',
                                    }}
                                >
                                    <Link
                                        to={`/types/${rootType?.id}`}
                                        className='font-semibold hover:underline'
                                    >
                                        {rootType?.name}
                                    </Link>
                                </LoadEffect>
                            </div>
                        </div>

                        {objectType.parent_id == null && (
                            <div className='flex items-center gap-3 rounded-lg border p-3'>
                                <PublicIcon
                                    src='/objects.svg'
                                    alt=''
                                    className='size-5'
                                />
                                <div>
                                    <div className='text-muted-foreground text-sm'>
                                        Корневой объект
                                    </div>
                                    {rootObject ? (
                                        <Link
                                            to={`/objects/${rootObject.id}`}
                                            className='font-semibold hover:underline'
                                        >
                                            {toString(rootObject)}
                                        </Link>
                                    ) : (
                                        <div className='flex items-center gap-2'>
                                            <span className='text-destructive font-semibold'>
                                                Не создан
                                            </span>
                                            <Button
                                                onClick={() => addRootObject()}
                                                size='sm'
                                                variant='outline'
                                            >
                                                Добавить
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default TypeMainInfo
