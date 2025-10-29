import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'

import { RestApiError } from '@/Http/RestApiClient.ts'
import type { Object } from '@/Schemas/Object.ts'
import { useServicesStore } from '@/Storages/Zustand.ts'
import { handleApiError } from '@/Utility/handle_api_error.ts'
import { toString } from '@/Utility/to_string.ts'
import LoadEffect from '../../Common/LoadEffect.tsx'
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
                setObject(await services.objectService.getObjectById(id))
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
        <Container className='mt-4'>
            <Row>
                <Col>
                    <Breadcrumb className='mb-3'>
                        <LoadEffect
                            data={object}
                            contentSize={{ height: '20px', width: '100%' }}
                        >
                            <Breadcrumb.Item href='/'>Главная</Breadcrumb.Item>
                            <Breadcrumb.Item active>
                                {object?.id}
                            </Breadcrumb.Item>
                        </LoadEffect>
                    </Breadcrumb>
                    <LoadEffect
                        data={object}
                        contentSize={{ height: '20px', width: '100%' }}
                    >
                        <h1 className='text-center mb-5'>
                            Объект "{toString(object)}"
                        </h1>

                        {object && <ObjectMainInfo object={object} />}
                    </LoadEffect>
                    <Tabs
                        defaultActiveKey='instances'
                        id='main-tabs'
                        className='mb-4'
                        justify
                    >
                        <Tab eventKey='instances' title='Экземпляры'>
                            {object && <ObjectInstancesTab object={object} />}
                        </Tab>

                        <Tab eventKey='properties' title='Свойства'>
                            {object && <ObjectPropertiesTab object={object} />}
                        </Tab>

                        <Tab eventKey='documents' title='Документы'>
                            {object && <ObjectDocumentsTab object={object} />}
                        </Tab>

                        <Tab eventKey='structure' title='Структура'>
                            {object && <ObjectTreeView object={object} />}
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    )
}

export default ObjectPage
