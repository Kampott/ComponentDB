import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Container from "react-bootstrap/Container";
import NavDropdown from "react-bootstrap/NavDropdown"


interface Props {
    objectsElementClick: CallableFunction
}


function HeadMenu({objectsElementClick}: Props) {
    return (
        <Navbar bg="light" expand="lg">
            <Container fluid>
                <Navbar.Brand href="/">
                    <img
                        src="/logo.png"
                        height="30"
                        className="d-inline-block align-top"
                        alt="Логотип"
                    />
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="main-navbar"/>
                <Navbar.Collapse id="main-navbar">
                    <Nav className="me-auto gap-5">
                        <Nav.Link className="me" onClick={() => objectsElementClick()}>Объекты</Nav.Link>
                        <Nav.Link className="me">Документы</Nav.Link>
                        <Nav.Link className="me">События</Nav.Link>
                    </Nav>
                    <Nav className="ms-auto gap-5">
                        <Nav.Link className="me">Справка</Nav.Link>
                        <NavDropdown title="Аккаунт" id="account-dropdown" align="end">
                            <NavDropdown.Item>Профиль</NavDropdown.Item>
                            <NavDropdown.Item>Выход</NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    )
}

export default HeadMenu;