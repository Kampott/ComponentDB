import { useState } from 'react'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import NavDropdown from 'react-bootstrap/NavDropdown'
import { Link } from 'react-router-dom'
import RootObjectsListMenu from './RootObjectsListMenu.tsx'

function HeadMenu() {
    const [showRootObjectsListMenu, setShowRootObjectsListMenu] =
        useState(false)

    const handleRootObjectsListMenuClose = () =>
        setShowRootObjectsListMenu(false)
    const toggleRootObjectsListMenuShow = () =>
        setShowRootObjectsListMenu(!showRootObjectsListMenu)

    return (
        <>
            <Navbar bg='light' expand='lg'>
                <Container fluid>
                    <Navbar.Brand href='/'>
                        <img
                            src='/logo.png'
                            height='30'
                            className='d-inline-block align-top'
                            alt='Логотип'
                        />
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls='main-navbar' />
                    <Navbar.Collapse id='main-navbar'>
                        <Nav className='me-auto gap-5'>
                            <Nav.Link
                                className='me'
                                onClick={() => toggleRootObjectsListMenuShow()}
                            >
                                Объекты
                            </Nav.Link>
                            <Nav.Link className='me'>Документы</Nav.Link>
                            <Nav.Link className='me'>События</Nav.Link>
                        </Nav>
                        <Nav className='ms-auto gap-5'>
                            <Nav.Link className='me'>Справка</Nav.Link>
                            <NavDropdown
                                title='Аккаунт'
                                id='account-dropdown'
                                align='end'
                            >
                                <NavDropdown.Item as={Link} to={'/login'}>
                                    Профиль
                                </NavDropdown.Item>
                                <NavDropdown.Item>Выход</NavDropdown.Item>
                            </NavDropdown>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <RootObjectsListMenu
                showObjectsMenu={showRootObjectsListMenu}
                handleClose={handleRootObjectsListMenuClose}
            />
        </>
    )
}

export default HeadMenu
