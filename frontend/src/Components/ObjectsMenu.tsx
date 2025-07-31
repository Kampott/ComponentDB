import {Button, Nav} from "react-bootstrap";
import {useState} from "react";
// import type {Object} from "../schemas/object.ts";

function ObjectsMenu() {
    const [sidebarVisible, setSidebarVisible] = useState(true);
    // const [rootObjects, setRootObjects] = useState<Object[]>([]);

    const toggleSidebar = () => {
        setSidebarVisible(!sidebarVisible)
    };

    return (
        <div className="d-flex" style={{height: '100vh', overflow: 'hidden'}}>
            {/* Боковая панель */}
            {sidebarVisible && (
                <div
                    className="bg-light border-end p-3 col-3"
                    style={{
                        height: '100vh',          // Ограничиваем высоту
                        overflowY: 'auto',        // Прокрутка только по Y
                        flexShrink: 0
                    }}
                >
                    <h5>Меню</h5>
                    <Nav className="flex-column">
                        {Array.from({length: 50}, (_, i) => (
                            <Nav.Link key={i} href="#">
                                Пункт {i + 1}
                            </Nav.Link>
                        ))}
                    </Nav>
                </div>
            )}

            {/* Основной контент */}
            <div className="flex-grow-1 p-3">
                <Button onClick={toggleSidebar} className="mb-3">
                    ☰ Меню
                </Button>
                <h1>Контент страницы</h1>
                <p>Здесь основной контент страницы. Прокручивается отдельно от меню.</p>
                <p style={{minHeight: '150vh'}}>Контент увеличен для демонстрации прокрутки.</p>
            </div>
        </div>
    );
}

export default ObjectsMenu;