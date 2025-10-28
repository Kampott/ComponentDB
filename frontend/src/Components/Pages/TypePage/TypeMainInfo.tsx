import {type ReactNode, useCallback, useEffect, useState} from "react";

import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import type {ObjectType} from "../../../schemas/ObjectType.ts";
import type {Object} from "../../../schemas/Object.ts";
import {useServicesStore} from "../../../stores/Zustand.ts";
import LoadEffect from "../../Common/LoadEffect.tsx";
import {Link} from "react-router-dom";
import {toString} from "../../../utility/to_string.ts";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";

interface Props {
    objectType: ObjectType
}

function TypeMainInfo({objectType}: Props): ReactNode {

    const services = useServicesStore((state) => state.services)

    const [rootObject, setRootObject] = useState<Object | null>(null);
    const [rootType, setRootType] = useState<ObjectType | null>(null);

    const loadRootObject = useCallback(async () => {
        setRootObject(null);
        try {
            const rootObjects: Object[] = await services.objectService.getObjectsByTypeId(objectType.id)
            if (rootObjects.length == 0) {
                return;
            }
            if (rootObjects.length > 1) {
                console.log(`У корневого типа ${objectType.id} каким-то образом больше 1 связанного объекта...`);
            }

            setRootObject(rootObjects[0]);
        } catch (error) {
            handleApiError(error as RestApiError, {
                showToast: (m) => alert(m)
            });
        }
    }, [services.objectService, objectType]);

    useEffect(() => {
        async function loadRootType() {
            setRootType(null);
            try {
                setRootType(await services.objectsTypesService.getTypeById(objectType.root_id));
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m) => alert(m)
                });
            }
        }

        if (objectType.parent_id == null) {
            loadRootObject();
        }
        loadRootType();
    }, [services.objectsTypesService, objectType]);


    async function addRootObject() {
        await services.objectService.addObject({
            name: objectType.name,
            type_id: objectType.id,
            parent_id: null
        })

        await loadRootObject()
    }

    return (
        <div className="mb-4">
            <Card className="shadow-sm border-0">
                <Card.Body>
                    <Row className="g-3 align-items-center">
                        <Col xs={12} md={6}>
                            <div className="d-flex align-items-center p-2 rounded hover-shadow"
                                 style={{transition: "all 0.2s"}}>
                                <i className="bi bi-bookmark-fill me-2 text-primary fs-4"></i>
                                <div>
                                    <div className="text-muted small">Корневой тип</div>
                                    <LoadEffect data={rootType} contentSize={{width: "30%", height: "15px"}}>
                                        <Link to={`/types/${rootType?.id}`}
                                           className="fw-bold text-decoration-none">
                                            {rootType?.name}
                                        </Link>
                                    </LoadEffect>
                                </div>
                            </div>
                        </Col>

                        {objectType.parent_id == null && <Col xs={12} md={6}>
                            <div className="d-flex align-items-center justify-content-between p-2 rounded hover-shadow"
                                 style={{transition: "all 0.2s"}}>
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-box-seam me-2 text-success fs-4"></i>
                                    <div>
                                        <div className="text-muted small">Корневой объект</div>
                                        {rootObject ? (
                                            <Link to={`/objects/${rootObject.id}`}
                                               className="fw-bold text-decoration-none">
                                                {toString(rootObject)}
                                            </Link>
                                        ) : (
                                            <>
                                                <span className="text-danger fw-bold">Не создан
                                                    <button onClick={() => addRootObject()}
                                                            className="btn btn-sm btn-outline-primary">Добавить</button>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>}
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
}

export default TypeMainInfo;