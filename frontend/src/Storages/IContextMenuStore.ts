import type { MouseEvent } from 'react'

export type OnObjectActionFunc<T> = (element: T) => void
export type ContextMenuOptions<T> = Record<string, OnObjectActionFunc<T> | undefined>

export default interface IContextMenuStore {
    visible: boolean
    position: { x: number; y: number }
    elementData?: unknown
    contextMenuOptions?: ContextMenuOptions<unknown>
    onContextMenuCall: <T>(
        e: MouseEvent<HTMLElement>,
        position: {
            x: number
            y: number
        },
        elementData: T,
        options: ContextMenuOptions<T>,
    ) => void
    hideMenu: () => void
}
