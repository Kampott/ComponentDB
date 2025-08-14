import {type ReactNode} from "react";

import ListGroup from "react-bootstrap/ListGroup";

export interface Props<T> {
    data: T[]
    onClick: ((element: T) => void) | null
    renderItem: (node: T) => ReactNode
}

function DefaultList<T>({data, onClick, renderItem}: Props<T>) {
    return (
        <ListGroup>
            {data.map((element, index) => (
                <ListGroup.Item
                    className="d-flex border-0 border-bottom pb-3 pt-3"
                    action={onClick != null}
                    onClick={(() => onClick && onClick(element))}
                    key={index}>
                    {renderItem(element)}
                </ListGroup.Item>
            ))}
        </ListGroup>
    )
}

export default DefaultList
