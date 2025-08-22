import {type ReactNode, useState} from "react";
import type {MouseEvent} from "react";

import ListGroup from "react-bootstrap/ListGroup";
import ContextMenu, {type Position} from "./ContextMenu.tsx";

export interface Props<T> {
    data: T[]
    onClick: ((element: T) => void) | null
    onChangeRequest?: (element: T) => void
    onDeleteRequest?: (element: T) => void
    renderItem: (node: T) => ReactNode
}

function DefaultList<T>({data, onClick, onChangeRequest, onDeleteRequest, renderItem}: Props<T>) {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [selectedMenuData, setSelectedMenuData] = useState<T | null>(null);
    const [rClickPosition, setRClickPosition] = useState<Position | null>(null);


    function handleContextMenu(e: MouseEvent<HTMLElement>, data: T) {
        if (!onChangeRequest || !onDeleteRequest) {
            return;
        }

        e.preventDefault();
        setSelectedMenuData(data);
        setRClickPosition({ x: e.pageX, y: e.pageY });
        setShowContextMenu(true);
    }

    function handleOptionClick(option: string, elementData: T) {
        if (option == "Изменить" && onChangeRequest) {
            onChangeRequest(elementData);
            return;
        }

        if (option == "Удалить" && onDeleteRequest) {
            onDeleteRequest(elementData);
            return;
        }

        console.warn(`Неизвестная опция: ${option}`)
    }

    function hideMenu() {
        setShowContextMenu(false);
        setSelectedMenuData(null);
    }

    return (
        <>
            <ListGroup>
                {data.map((element: T, index: number) => (
                    <ListGroup.Item
                        className="d-flex border-0 border-bottom pb-3 pt-3"
                        action={onClick != null}
                        onClick={(() => onClick && onClick(element))}
                        onContextMenu={(e) => handleContextMenu(e, element)}
                        key={index}>
                        {renderItem(element)}
                    </ListGroup.Item>
                ))}
            </ListGroup>

            {showContextMenu && rClickPosition && selectedMenuData && <ContextMenu
                elementData={selectedMenuData}
                position={rClickPosition}
                options={["Изменить", "Удалить"]}
                onOptionClick={handleOptionClick}
                onHideClick={hideMenu}/>
            }
        </>
    )
}

export default DefaultList
