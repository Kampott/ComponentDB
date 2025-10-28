import {type ReactNode, useEffect, useState} from "react";

import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import type {Object} from "../../../schemas/Object.ts";
import {useServicesStore} from "../../../stores/Zustand.ts";
import LoadEffect from "../../Common/LoadEffect.tsx";
import {Link} from "react-router-dom";
import {handleApiError} from "../../../utility/handle_api_error.ts";
import {RestApiError} from "../../../http/RestApiClient.ts";
import type {ObjectInstance} from "../../../schemas/ObjectInstance.ts";

interface Props {
    instance: ObjectInstance
}

function InstanceMainInfo({instance}: Props): ReactNode {
    const services = useServicesStore((state) => state.services)

    const [parentInstance, setParentInstance] = useState<ObjectInstance | null>(null);
    const [rootInstance, setRootInstance] = useState<ObjectInstance | null>(null);
    const [obj, setObj] = useState<Object | null>(null);

    useEffect(() => {
        async function loadParentInstance() {
            if (!instance.parent_id) {
                return;
            }

            setParentInstance(null);
            try {
                const parentInstance: ObjectInstance = await services.objectsInstancesService.getInstanceById(instance.parent_id);
                setParentInstance(parentInstance);
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m) => alert(m)
                });
            }
        }

        async function loadRootInstance() {
            setRootInstance(null);
            try {
                const rootInstance: ObjectInstance = await services.objectsInstancesService.getInstanceById(instance.root_id);
                setRootInstance(rootInstance);
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m) => alert(m)
                });
            }
        }

        async function loadObject() {
            setObj(null);
            try {
                const obj: Object = await services.objectService.getObjectById(instance.object_id);
                setObj(obj);
            } catch (error) {
                handleApiError(error as RestApiError, {
                    showToast: (m: string) => alert(m)
                });
            }
        }

        loadParentInstance();
        loadRootInstance();
        loadObject();
    }, [services.objectService, services.objectsTypesService, services.objectsInstancesService, instance]);

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
                                    <div className="text-muted small">Родитель</div>
                                    <LoadEffect data={parentInstance} contentSize={{width: "30%", height: "15px"}}>
                                        <Link to={`/objects/${parentInstance?.id}`}
                                              className="fw-bold text-decoration-none">
                                            {parentInstance?.name}
                                        </Link>
                                    </LoadEffect>
                                </div>
                            </div>
                        </Col>

                        <Col xs={12} md={6}>
                            <div className="d-flex align-items-center p-2 rounded hover-shadow"
                                 style={{transition: "all 0.2s"}}>
                                <i className="bi bi-bookmark-fill me-2 text-primary fs-4"></i>
                                <div>
                                    <div className="text-muted small">Корневой экземпляр</div>
                                    <LoadEffect data={rootInstance} contentSize={{width: "30%", height: "15px"}}>
                                        <Link to={`/objects/${rootInstance?.id}`}
                                              className="fw-bold text-decoration-none">
                                            {rootInstance?.name}
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
                                        <div className="text-muted small">Объект</div>
                                        <LoadEffect data={obj} contentSize={{width: "30%", height: "15px"}}>
                                            <Link to={`/types/${obj?.id}`}
                                                  className="fw-bold text-decoration-none">
                                                {obj?.name}
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

export default InstanceMainInfo;