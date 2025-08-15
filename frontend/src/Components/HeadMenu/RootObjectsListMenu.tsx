import Offcanvas from "react-bootstrap/Offcanvas";

import {type ReactNode, useEffect, useState} from "react";

import type {ObjectType, ObjectTypeAdd} from "../../schemas/ObjectType.ts";
import {useStore} from "../../store/Zustand.ts";
import Button from "react-bootstrap/Button";
import {useNavigate} from "react-router-dom";
import LoadEffect from "../Common/LoadEffect.tsx";
import DefaultList from "../Common/DefaultList.tsx";
import AddObjectTypeForm from "../Forms/AddObjectTypeForm.tsx";


interface Props {
    showObjectsMenu: boolean;
    handleClose: CallableFunction
}

function RootObjectsListMenu({showObjectsMenu, handleClose}: Props) {
    const navigate = useNavigate();

    const services = useStore((state) => state.services)

    const [rootObjectTypes, setRootObjectTypes] = useState<ObjectType[] | null>(null);
    const [formShow, setFormShow] = useState(false)

    function handleObjectTypeClick(objectType: ObjectType) {
        navigate(`/types/${objectType.id}`)
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

    function renderObjectType(objectType: ObjectType): ReactNode {
        return (
            <>{objectType.name}</>
        )
    }

    useEffect(() => {
        loadRootObjectTypes()
    }, [])

    async function confirmAddType(data: ObjectTypeAdd | null) {
        if (!data) {
            setFormShow(false)
            return
        }

        await services.objectsTypesService.addType(data)
        setFormShow(false)
        await loadRootObjectTypes()
    }

    return (
        <>
            <Offcanvas show={showObjectsMenu} onHide={handleClose} placement="start">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Список типов</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <LoadEffect data={rootObjectTypes} contentSize={{height: "20px", width: "100%"}}>
                        <DefaultList data={rootObjectTypes ? rootObjectTypes : []} onClick={handleObjectTypeClick}
                                     renderItem={renderObjectType}/>
                    </LoadEffect>
                    <Button variant="primary" className="mt-4" onClick={() => setFormShow(true)}>Добавить тип</Button>
                </Offcanvas.Body>
            </Offcanvas>

            {formShow && <AddObjectTypeForm parentObjectType={null} submitCallback={confirmAddType}/>}
        </>
    )
}

export default RootObjectsListMenu;