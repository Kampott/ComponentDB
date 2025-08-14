import Offcanvas from "react-bootstrap/Offcanvas";
import ListGroup from "react-bootstrap/ListGroup";

import {useEffect, useState} from "react";

import type {ObjectType, ObjectTypeAdd} from "../../schemas/ObjectType.ts";
import {useStore} from "../../store/Zustand.ts";
import Button from "react-bootstrap/Button";
import AddRootObjectForm from "./AddRootObjectForm.tsx";
import {useNavigate} from "react-router-dom";
import LoadEffect from "../Common/LoadEffect.tsx";


interface Props {
    showObjectsMenu: boolean;
    handleClose: CallableFunction
}

function RootObjectsListMenu({showObjectsMenu, handleClose}: Props) {
    const navigate = useNavigate();

    const services = useStore((state) => state.services)

    const [rootObjectTypes, setRootObjectTypes] = useState<ObjectType[] | null>(null);
    const [formShow, setFormShow] = useState(false)

    function handleObjectTypeClick(id: number) {
        navigate(`/types/${id}`)
    }

    async function confirmAddType(data: ObjectTypeAdd | null) {
        console.log(data)
        if (!data) {
            setFormShow(false)
            return
        }

        await services.objectsTypesService.addType(data)
        setFormShow(false)
        await loadRootObjectTypes()
    }

    async function loadRootObjectTypes() {
        try {
            setRootObjectTypes(await services.objectsTypesService.getRootTypes())
        } catch (error) {
            if (error instanceof Error) {
                console.log(error)
            }
        }
    }

    useEffect(() => {
        loadRootObjectTypes()
    }, [])

    return (
        <>
        <Offcanvas show={showObjectsMenu} onHide={handleClose} placement="start">
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>Список типов</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                <LoadEffect data={rootObjectTypes} contentSize={{height: "20px", width: "100%"}}>
                    <ListGroup>
                        {rootObjectTypes?.map((rootObjectType, id) => (
                            <ListGroup.Item
                                key={id}
                                action
                                onClick={() => handleObjectTypeClick(rootObjectType.id)}
                            >
                                {rootObjectType.name}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </LoadEffect>
                <Button variant="primary" className="mt-4" onClick={() => setFormShow(true)}>Добавить тип</Button>
            </Offcanvas.Body>
        </Offcanvas>

        {formShow && <AddRootObjectForm confirmAddCallback={confirmAddType} />}
        </>
    )
}

export default RootObjectsListMenu;