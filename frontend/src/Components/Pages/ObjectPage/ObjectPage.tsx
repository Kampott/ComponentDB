import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Button from "react-bootstrap/Button";
import ListGroup from "react-bootstrap/ListGroup";
import Image from "react-bootstrap/Image";

import ObjectTreeView from "./ObjectTreeView.tsx";
import {useStore} from "../../../store/Zustand.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import type {Object} from "../../../schemas/Object.ts";

function ObjectPage() {
    const {objectId} = useParams()
    const navigate = useNavigate()

    const services = useStore((state) => state.services)

    const [object, setObject] = useState<Object | null>(null);

    const instances = [
        'БАРК-4821',
        'БАРК-1937',
        'БАРК-6504',
        'БАРК-3098'
    ];

    const properties = [
        {name: 'Цвет', value: 'Синий'},
        {name: 'Размер', value: 'L'},
        {name: 'Вес', value: '2 кг'},
        {name: 'Материал', value: 'Металл'}
    ];

    const documents = [
        'Документ1.pdf',
        'Отчет_апрель.docx',
        'Спецификация.xlsx'
    ];

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
                            <Button variant="primary" className="mt-4">Добавить экземпляр</Button>
                            <ListGroup>

                                {instances.map((inst, i) => (
                                    <ListGroup.Item action className="border-0 border-bottom pb-3 pt-3"
                                                    key={i}>{inst}</ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Tab>

                        <Tab eventKey="properties" title="Свойства">
                            <Button variant="primary" className="mt-4">Добавить свойство</Button>
                            <ListGroup>
                                {properties.map((prop, i) => (
                                    <ListGroup.Item action key={i} className="d-flex border-0 border-bottom pb-3 pt-3">
                                        <div className="w-50 text-start">{prop.name}</div>
                                        <div className="w-50 text-start">{prop.value}</div>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Tab>

                        <Tab eventKey="documents" title="Документы">
                            <Button variant="primary" className="mt-4">Добавить документ</Button>
                            <ListGroup>
                                {documents.map((doc, i) => (
                                    <ListGroup.Item
                                        className="d-flex justify-content-between align-items-center border-0 border-bottom py-3"
                                        key={i}
                                    >
                                        <Button
                                            variant="link"
                                            className="p-0"
                                            onClick={() => console.log(`Скачать ${doc}`)}
                                            aria-label={`Перейти к ${doc}`}
                                        >{doc}</Button>
                                        <Button
                                            variant="link"
                                            className="p-0"
                                            onClick={() => console.log(`Скачать ${doc}`)}
                                            aria-label={`Скачать ${doc}`}
                                        >
                                            <Image
                                                src="/download_icon.svg"
                                                alt="Скачать"
                                                width={24}
                                                height={24}
                                                style={{cursor: 'pointer'}}
                                                className="opacity-75"
                                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.75')}
                                            />
                                        </Button>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </Tab>

                        <Tab eventKey="structure" title="Структура">
                            {object && <ObjectTreeView objectId={object.id}/>}
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
}

export default ObjectPage;