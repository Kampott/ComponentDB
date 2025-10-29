import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Col from 'react-bootstrap/Col'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'

import { RestApiError } from '@/Http/RestApiClient.ts'
import type { ObjectInstance } from '@/Schemas/ObjectInstance.ts'
import { useServicesStore } from '@/Storages/Zustand.ts'
import { handleApiError } from '@/Utility/handle_api_error.ts'
import { toString } from '@/Utility/to_string.ts'
import LoadEffect from '../../Common/LoadEffect.tsx'
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
                setInstance(
                    await services.objectsInstancesService.getInstanceById(id),
                )
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
        <Container className='mt-4'>
            <Row>
                <Col>
                    <Breadcrumb className='mb-3'>
                        <LoadEffect
                            data={instance}
                            contentSize={{ height: '20px', width: '100%' }}
                        >
                            <Breadcrumb.Item href='/'>Главная</Breadcrumb.Item>
                            <Breadcrumb.Item active>
                                {instance?.id}
                            </Breadcrumb.Item>
                        </LoadEffect>
                    </Breadcrumb>
                    <LoadEffect
                        data={instance}
                        contentSize={{ height: '20px', width: '100%' }}
                    >
                        <h1 className='text-center mb-5'>
                            Экземпляр "{toString(instance)}"
                        </h1>

                        {instance && <InstanceMainInfo instance={instance} />}
                    </LoadEffect>
                    <Tabs
                        defaultActiveKey='instances'
                        id='main-tabs'
                        className='mb-4'
                        justify
                    >
                        <Tab eventKey='instances' title='События'>
                            {instance && <InstanceEventsTab />}
                        </Tab>

                        <Tab eventKey='properties' title='Свойства'>
                            {instance && (
                                <InstancePropertiesTab instance={instance} />
                            )}
                        </Tab>

                        <Tab eventKey='documents' title='Документы'>
                            {instance && (
                                <InstanceDocumentsTab instance={instance} />
                            )}
                        </Tab>

                        <Tab eventKey='structure' title='Структура'>
                            {instance && (
                                <InstanceTreeView instance={instance} />
                            )}
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    )
}

export default InstancePage
