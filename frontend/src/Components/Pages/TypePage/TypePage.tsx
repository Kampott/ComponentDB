import {useNavigate, useParams} from "react-router-dom";
import {useEffect, useState} from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";

import type {ObjectType} from "../../../schemas/ObjectType.ts";
import {useStore} from "../../../store/Zustand.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import LoadEffect from "../../Common/LoadEffect.tsx";
import TypeObjectsTab from "./TypeObjectsTab.tsx";
import TypePropertiesTab from "./TypePropertiesTab.tsx";
import TypeTreeView from "./TypeTreeView.tsx";
import TypeMainInfo from "./TypeMainInfo.tsx";
import {handleApiError} from "../../../utility/handle_api_error.ts";

function TypePage() {
    const {typeId} = useParams();
    const navigate = useNavigate();

    const services = useStore((state) => state.services)

    const id: number = Number(typeId)

    const [objectType, setObjectType] = useState<ObjectType | null>(null);

    useEffect(() => {
        async function loadObjectType() {
            setObjectType(null);
            if (isNaN(id)) {
                navigate("/404");
                return;
            }

            try {
                setObjectType(await services.objectsTypesService.getTypeById(id))
            } catch (error) {
                handleApiError(error as RestApiError, {
                    navigate,
                    showToast: (m) => alert(m)
                });
            }
        }
        loadObjectType();
    }, [navigate, services.objectsTypesService, id, typeId])

    return (
        <Container className="mt-4">
            <Row>
                <Col>
                    <Breadcrumb className="mb-3">
                        <LoadEffect data={objectType} contentSize={{height: "20px", width: "100%"}}>
                            <Breadcrumb.Item href="/">Главная</Breadcrumb.Item>
                            <Breadcrumb.Item active>{objectType?.name}</Breadcrumb.Item>
                        </LoadEffect>
                    </Breadcrumb>

                    <LoadEffect data={objectType} contentSize={{height: "20px", width: "100%"}}>
                        <h1 className="text-center mb-5">Тип "{objectType?.name}"</h1>

                        {objectType && <TypeMainInfo objectType={objectType}/>}
                    </LoadEffect>

                    <Tabs defaultActiveKey="instances" id="main-tabs" className="mb-4" justify>
                        <Tab eventKey="instances" title="Объекты">
                            {objectType && <TypeObjectsTab objectType={objectType}/>}
                        </Tab>

                        <Tab eventKey="properties" title="Свойства">
                            {objectType && <TypePropertiesTab objectType={objectType}/>}
                        </Tab>

                        <Tab eventKey="structure" title="Структура">
                            {objectType && <TypeTreeView objectType={objectType}/>}
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    )
}

export default TypePage;