import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";

import ObjectTreeView from "./ObjectTreeView.tsx";
import {useStore} from "../../../store/Zustand.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import type {Object} from "../../../schemas/Object.ts";
import ObjectInstancesTab from "./ObjectInstancesTab.tsx";
import ObjectPropertiesTab from "./ObjectPropertiesTab.tsx";
import ObjectDocumentsTab from "./ObjectDocumentsTab.tsx";

function ObjectPage() {
    const {objectId} = useParams()
    const navigate = useNavigate()

    const services = useStore((state) => state.services)

    const [object, setObject] = useState<Object | null>(null);

    const id: number = Number(objectId)

    async function loadObject() {
        if (isNaN(id)) {
            navigate("/404")
            return
        }

        try {
            setObject(await services.objectService.getObjectById(id))
        } catch (error) {
            if (error instanceof RestApiError) {
                const apiError: RestApiError = error as RestApiError
                if (apiError.statusCode && apiError.statusCode == 404) {
                    navigate("/404")
                    return
                }
            }
            if (error instanceof Error) {
                console.log(error)
            }
        }
    }

    useEffect(() => {
        loadObject()
    }, [])

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <Breadcrumb className="mb-3">
                        <Breadcrumb.Item href="/">Главная</Breadcrumb.Item>
                        <Breadcrumb.Item active>Тип 2</Breadcrumb.Item>
                    </Breadcrumb>
                    <h1 className="text-center mb-5">Тип 2</h1>
                    <Tabs defaultActiveKey="instances" id="main-tabs" className="mb-4" justify>
                        <Tab eventKey="instances" title="Экземпляры">
                            {object && <ObjectInstancesTab object={object}/>}
                        </Tab>

                        <Tab eventKey="properties" title="Свойства">
                            {object && <ObjectPropertiesTab object={object}/>}
                        </Tab>

                        <Tab eventKey="documents" title="Документы">
                            {object && <ObjectDocumentsTab object={object}/>}
                        </Tab>

                        <Tab eventKey="structure" title="Структура">
                            {object && <ObjectTreeView object={object}/>}
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
}

export default ObjectPage;