import type { MouseEvent, ReactNode } from 'react'

import { usePagination } from '@/lib/usePagination.ts'
import { cn } from '@/lib/utils'
import type { OnObjectActionFunc } from '@Storage'
import { useContextMenuStore } from '@StorageImpl'
import PaginationControls from './PaginationControls.tsx'
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
    pageSize?: number
}

function DefaultList<T>({
    data,
    onClick,
    onViewRequest,
    onAddRequest,
    onChangeRequest,
    onDeleteRequest,
    renderItem,
    pageSize = 10,
}: Props<T>) {
    const { onContextMenuCall } = useContextMenuStore()
    const { page, setPage, totalPages, visibleItems } = usePagination(
        data,
        pageSize,
    )

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
        <div>
            <div className='overflow-hidden rounded-md border'>
                {visibleItems.map((element: T, index: number) => (
                    <div
                        className={cn(
                            'flex min-h-12 items-center px-3 py-2',
                            index < visibleItems.length - 1 && 'border-b',
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
            {data.length > pageSize ? (
                <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />
            ) : null}
        </div>
    )
}

export default DefaultList
