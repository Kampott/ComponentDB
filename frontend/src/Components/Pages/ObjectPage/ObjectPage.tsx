import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";

import ObjectTreeView from "./ObjectTreeView.tsx";
import {useServicesStore} from "../../../stores/Zustand.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import type {Object} from "../../../schemas/Object.ts";
import ObjectInstancesTab from "./ObjectInstancesTab.tsx";
import ObjectPropertiesTab from "./ObjectPropertiesTab.tsx";
import ObjectDocumentsTab from "./ObjectDocumentsTab.tsx";
import LoadEffect from "../../Common/LoadEffect.tsx";
import ObjectMainInfo from "./ObjectMainInfo.tsx";
import objectToString from "../../../utility/object_to_string.ts";
import {handleApiError} from "../../../utility/handle_api_error.ts";

function ObjectPage() {
    const {objectId} = useParams()
    const navigate = useNavigate()

    const services = useServicesStore((state) => state.services)

    const [object, setObject] = useState<Object | null>(null);

    const id: number = Number(objectId)

    useEffect(() => {
        async function loadObject() {
            setObject(null);

            if (isNaN(id)) {
                navigate("/404")
                return
            }

            try {
                setObject(await services.objectService.getObjectById(id))
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: (m) => alert(m)
                });
            }
        }

        loadObject();
    }, [services.objectService, id, navigate, objectId])

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <Breadcrumb className="mb-3">
                        <LoadEffect data={object} contentSize={{height: "20px", width: "100%"}}>
                            <Breadcrumb.Item href="/">Главная</Breadcrumb.Item>
                            <Breadcrumb.Item active>{object?.id}</Breadcrumb.Item>
                        </LoadEffect>
                    </Breadcrumb>
                    <LoadEffect data={object} contentSize={{height: "20px", width: "100%"}}>
                        <h1 className="text-center mb-5">Объект "{objectToString(object)}"</h1>

                        {object && <ObjectMainInfo object={object} />}
                    </LoadEffect>
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