import { type ReactNode, useEffect, useState } from 'react'

import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'

import LoadEffect from '@Components/Common/LoadEffect.tsx'
import { handleApiError } from '@Rest/handle_api_error.ts'
import { RestApiError } from '@Rest/RestApiClient.ts'
import type { Object, ObjectInstance, ObjectType } from '@Schemas'
import { useServicesStore, useToastStore } from '@StorageImpl'
import Button from 'react-bootstrap/Button'
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
            <Card className='shadow-sm border-0'>
                <Card.Body>
                    <Row className='g-3 align-items-center'>
                        <Col xs={12} md={6}>
                            <div
                                className='d-flex align-items-center p-2 rounded hover-shadow'
                                style={{ transition: 'all 0.2s' }}
                            >
                                <i className='bi bi-bookmark-fill me-2 text-primary fs-4'></i>
                                <div>
                                    <div className='text-muted small'>
                                        Корневой объект
                                    </div>
                                    <LoadEffect
                                        data={rootObject}
                                        contentSize={{
                                            width: '30%',
                                            height: '15px',
                                        }}
                                    >
                                        <Link
                                            to={`/objects/${rootObject?.id}`}
                                            className='fw-bold text-decoration-none'
                                        >
                                            {rootObject?.name}
                                        </Link>
                                    </LoadEffect>
                                </div>
                            </div>
                        </Col>

                        <Col xs={12} md={6}>
                            <div
                                className='d-flex align-items-center justify-content-between p-2 rounded hover-shadow'
                                style={{ transition: 'all 0.2s' }}
                            >
                                <div className='d-flex align-items-center'>
                                    <i className='bi bi-box-seam me-2 text-success fs-4'></i>
                                    <div>
                                        <div className='text-muted small'>
                                            Тип
                                        </div>
                                        <LoadEffect
                                            data={objectType}
                                            contentSize={{
                                                width: '30%',
                                                height: '15px',
                                            }}
                                        >
                                            <Link
                                                to={`/types/${objectType?.id}`}
                                                className='fw-bold text-decoration-none'
                                            >
                                                {objectType?.name}
                                            </Link>
                                        </LoadEffect>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                    {object.parent_id == null && (
                        <Row className='g-3 align-items-center'>
                            <Col xs={12} md={6}>
                                <div
                                    className='d-flex align-items-center p-2 rounded hover-shadow'
                                    style={{ transition: 'all 0.2s' }}
                                >
                                    <i className='bi bi-bookmark-fill me-2 text-primary fs-4'></i>
                                    <Button
                                        onClick={() => createObjectInstance()}
                                    >
                                        Добавить экземпляр
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    )}
                </Card.Body>
            </Card>
        </div>
    )
}

export default ObjectMainInfo
