import Offcanvas from "react-bootstrap/Offcanvas";
import ListGroup from "react-bootstrap/ListGroup";


interface Props {
    showObjectsMenu: boolean;
    handleClose: CallableFunction
}

function RootObjectsListMenu({showObjectsMenu, handleClose}: Props) {
    return (
        <Offcanvas show={showObjectsMenu} onHide={handleClose} placement="start">
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>Список объектов</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                <ListGroup>
                    <ListGroup.Item action>Тип 1</ListGroup.Item>
                    <ListGroup.Item action>Тип 2</ListGroup.Item>
                    <ListGroup.Item action>Тип 3</ListGroup.Item>
                </ListGroup>
            </Offcanvas.Body>
        </Offcanvas>
    )
}

export default RootObjectsListMenu;