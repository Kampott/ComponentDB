import Dropdown from "react-bootstrap/Dropdown";
import {useEffect, useRef} from "react";

export type Position = {
    x: number;
    y: number;
}

interface Props<T> {
    elementData: T;
    position: Position;
    options: string[];
    onOptionClick: (option: string, elementData: T) => void;
    onHideClick: () => void;
}

function ContextMenu<T>({elementData, position, options, onOptionClick, onHideClick}: Props<T>) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onHideClick();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onHideClick]);

    return (
        <Dropdown.Menu
            show={true}
            ref={menuRef}
            style={{
                position: "absolute",
                left: position.x,
                top: position.y,
            }}
        >
            {
                options.map((option: string, index: number) => (
                    <Dropdown.Item
                        key={index}
                        onClick={() => onOptionClick(option, elementData)}
                    >{option}</Dropdown.Item>
                ))
            }
            <Dropdown.Divider />
            <Dropdown.Item
                onClick={() => onHideClick()}
            >Закрыть</Dropdown.Item>
        </Dropdown.Menu>
    );
}

export default ContextMenu;
