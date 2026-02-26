import type { MouseEvent, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import type { OnObjectActionFunc } from '@Storage'
import { useContextMenuStore } from '@StorageImpl'
import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from './context_actions.ts'

export interface Props<T> {
    data: T[]
    onClick?: OnObjectActionFunc<T>
    onViewRequest?: OnObjectActionFunc<T>
    onAddRequest?: OnObjectActionFunc<T>
    onChangeRequest?: OnObjectActionFunc<T>
    onDeleteRequest?: OnObjectActionFunc<T>
    renderItem: (node: T) => ReactNode
}

function DefaultList<T>({
    data,
    onClick,
    onViewRequest,
    onAddRequest,
    onChangeRequest,
    onDeleteRequest,
    renderItem,
}: Props<T>) {
    const { onContextMenuCall } = useContextMenuStore()

    const contextMenuOptions = buildContextMenuOptions({
        onViewRequest,
        onAddRequest,
        onChangeRequest,
        onDeleteRequest,
    })
    const isInteractive = hasContextMenuActions(contextMenuOptions)

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
        <div className='overflow-hidden rounded-md border'>
            {data.map((element: T, index: number) => (
                <div
                    className={cn(
                        'flex min-h-12 items-center px-3 py-2',
                        index < data.length - 1 && 'border-b',
                        onClick && 'cursor-pointer hover:bg-accent/40',
                    )}
                    onClick={() => onClick && onClick(element)}
                    onContextMenu={e => handleContextMenu(e, element)}
                    key={index}
                >
                    {renderItem(element)}
                </div>
            ))}
        </div>
    )
}

export default DefaultList
