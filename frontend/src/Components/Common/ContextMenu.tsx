import Dropdown from "react-bootstrap/Dropdown";

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
    return (
        <Dropdown.Menu
            show={true}
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
