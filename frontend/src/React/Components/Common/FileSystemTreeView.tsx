import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ContextMenuOptions, OnObjectActionFunc } from '@Storage'
import { useContextMenuStore } from '@StorageImpl'
import {
    buildContextMenuOptions,
    hasContextMenuActions,
} from './context_actions.ts'

export type DataNode<T> = {
    id: number
    data: T
    children: DataNode<T>[] | null
    childrenLoaded?: boolean
}

export interface Props<T> {
    data: DataNode<T>[]
    openIds: Set<number>
    onToggle: (id: number) => void
    renderItem: (node: DataNode<T>) => ReactNode

    onRequestChildren?: (id: number) => Promise<DataNode<T>[]>
    onChildrenLoaded?: (id: number, children: DataNode<T>[]) => void

    onViewRequest?: OnObjectActionFunc<T>
    onAddRequest?: OnObjectActionFunc<T>
    onChangeRequest?: OnObjectActionFunc<T>
    onDeleteRequest?: OnObjectActionFunc<T>
    extraContextMenuOptions?: ContextMenuOptions<T>
}

function FileSystemTreeView<T>({
    data,
    openIds,
    onToggle,
    renderItem,
    onRequestChildren,
    onChildrenLoaded,
    onViewRequest,
    onAddRequest,
    onChangeRequest,
    onDeleteRequest,
    extraContextMenuOptions,
}: Props<T>) {
    const { onContextMenuCall } = useContextMenuStore()

    const contextMenuOptions = buildContextMenuOptions({
        onViewRequest,
        onAddRequest,
        onChangeRequest,
        onDeleteRequest,
        extraOptions: extraContextMenuOptions,
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

    async function handleToggle(node: DataNode<T>) {
        onToggle(node.id)

        const willOpen = !openIds.has(node.id)
        if (
            willOpen &&
            node.children === null &&
            onRequestChildren &&
            onChildrenLoaded
        ) {
            try {
                const children = await onRequestChildren(node.id)
                onChildrenLoaded(node.id, children)
            } catch (e) {
                console.error('Failed to load children for', node.id, e)
            }
        }
    }

    function renderNodes(nodes: DataNode<T>[], depth = 0): ReactNode {
        return (
            <div className='divide-y'>
                {nodes.map(node => {
                    const isOpen = openIds.has(node.id)
                    const canToggle =
                        onRequestChildren != null ||
                        (node.children != null && node.children.length > 0)

                    return (
                        <Collapsible open={isOpen} key={node.id}>
                            <div
                                className='grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 px-2 py-2'
                                onContextMenu={e =>
                                    handleContextMenu(e, node.data)
                                }
                            >
                                <CollapsibleTrigger asChild>
                                    <button
                                        type='button'
                                        className={cn(
                                            'hover:bg-accent/50 flex size-7 items-center justify-center rounded-md transition-colors',
                                            !canToggle &&
                                                'pointer-events-none opacity-40',
                                        )}
                                        onClick={() => {
                                            if (canToggle) {
                                                handleToggle(node)
                                            }
                                        }}
                                    >
                                        {canToggle ? (
                                            isOpen ? (
                                                <ChevronDown className='size-4' />
                                            ) : (
                                                <ChevronRight className='size-4' />
                                            )
                                        ) : (
                                            <span className='text-muted-foreground text-xs'>
                                                •
                                            </span>
                                        )}
                                    </button>
                                </CollapsibleTrigger>

                                <div
                                    style={{
                                        paddingInlineStart: `${depth * 14}px`,
                                    }}
                                    className='min-w-0'
                                >
                                    {renderItem(node)}
                                </div>
                            </div>

                            <CollapsibleContent>
                                {isOpen &&
                                node.children &&
                                node.children.length > 0 ? (
                                    <div className='ml-4 border-l'>
                                        {renderNodes(node.children, depth + 1)}
                                    </div>
                                ) : null}
                            </CollapsibleContent>
                        </Collapsible>
                    )
                })}
            </div>
        )
    }

    return (
        <div className='overflow-hidden rounded-md border'>
            <div className='bg-muted/40 text-muted-foreground grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 border-b px-2 py-2 text-xs font-medium uppercase tracking-wide'>
                <span />
                <span>Элементы</span>
            </div>
            {renderNodes(data)}
        </div>
    )
}

export default FileSystemTreeView
