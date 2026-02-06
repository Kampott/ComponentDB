import type { MouseEvent } from 'react'
import { type ReactNode } from 'react'

import type { ContextMenuOptions, OnObjectActionFunc } from '@Storage'
import { useContextMenuStore } from '@StorageImpl'
import ListGroup from 'react-bootstrap/ListGroup'

export interface Props<T> {
    data: T[]
    onClick?: OnObjectActionFunc<T>
    onViewRequest?: OnObjectActionFunc<T>
    onChangeRequest?: OnObjectActionFunc<T>
    onDeleteRequest?: OnObjectActionFunc<T>
    renderItem: (node: T) => ReactNode
}

function DefaultList<T>({
    data,
    onClick,
    onViewRequest,
    onChangeRequest,
    onDeleteRequest,
    renderItem,
}: Props<T>) {
    const { onContextMenuCall } = useContextMenuStore()

    const contextMenuOptions: ContextMenuOptions<T> = {
        Посмотреть: onViewRequest,
        Изменить: onChangeRequest,
        Удалить: onDeleteRequest,
    }
    const isInteractive = Object.values(contextMenuOptions).some(Boolean)

    function handleContextMenu(e: MouseEvent<HTMLElement>, element: T) {
        if (!isInteractive) {
            return
        }
        onContextMenuCall(
            e,
            { x: e.clientX, y: e.clientY },
            element,
            contextMenuOptions,
        )
    }

    return (
        <>
            <ListGroup>
                {data.map((element: T, index: number) => (
                    <ListGroup.Item
                        className='d-flex border-0 border-bottom pb-3 pt-3'
                        action={onClick != null}
                        onClick={() => onClick && onClick(element)}
                        onContextMenu={e => handleContextMenu(e, element)}
                        key={index}
                    >
                        {renderItem(element)}
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </>
    )
}

export default DefaultList
