import {type ReactNode, useEffect, useState} from "react";

import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import type {ObjectType} from "../../../schemas/ObjectType.ts";
import type {Object} from "../../../schemas/Object.ts";
import {useStore} from "../../../store/Zustand.ts";
import LoadEffect from "../../Common/LoadEffect.tsx";
import {Link} from "react-router-dom";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";

interface Props {
    object: Object
}

function ObjectMainInfo({object}: Props): ReactNode {
    const services = useStore((state) => state.services)

    const [rootObject, setRootObject] = useState<Object | null>(null);
    const [objectType, setObjectType] = useState<ObjectType | null>(null);

    useEffect(() => {
        async function loadRootObject() {
            setRootObject(null);
            try {
                const rootObject: Object = await services.objectService.getObjectById(object.root_id)
                setRootObject(rootObject);
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m) => alert(m)
                });
            }
        }

        async function loadObjectType() {
            setObjectType(null);
            try {
                setObjectType(await services.objectsTypesService.getTypeById(object.type_id));
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m) => alert(m)
                });
            }
        }

        loadRootObject();
        loadObjectType();
    }, [services.objectService, services.objectsTypesService, object]);

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
                                    <div className="text-muted small">Корневой объект</div>
                                    <LoadEffect data={rootObject} contentSize={{width: "30%", height: "15px"}}>
                                        <Link to={`/objects/${rootObject?.id}`}
                                           className="fw-bold text-decoration-none">
                                            {rootObject?.name}
                                        </Link>
                                    </LoadEffect>
                                </div>
                            </div>
                        </Col>

                        <Col xs={12} md={6}>
                            <div className="d-flex align-items-center justify-content-between p-2 rounded hover-shadow"
                                 style={{transition: "all 0.2s"}}>
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-box-seam me-2 text-success fs-4"></i>
                                    <div>
                                        <div className="text-muted small">Тип</div>
                                        <LoadEffect data={objectType} contentSize={{width: "30%", height: "15px"}}>
                                            <Link to={`/types/${objectType?.id}`}
                                               className="fw-bold text-decoration-none">
                                                {objectType?.name}
                                            </Link>
                                        </LoadEffect>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
}

export default ObjectMainInfo;