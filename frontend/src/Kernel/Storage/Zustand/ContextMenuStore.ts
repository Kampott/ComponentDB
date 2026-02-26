import type { MouseEvent } from 'react'
import { create } from 'zustand/react'

import type { ContextMenuOptions, IContextMenuStore } from '@Storage'

export const useContextMenuStore = create<IContextMenuStore>(set => ({
    visible: false,
    position: { x: 0, y: 0 },
    onContextMenuCall: <T>(
        e: MouseEvent<HTMLElement>,
        position: {
            x: number
            y: number
        },
        elementData: T,
        contextMenuOptions: ContextMenuOptions<T>,
    ) => {
        e.preventDefault()
        set({
            visible: true,
            position: position,
            elementData: elementData,
            contextMenuOptions:
                contextMenuOptions as ContextMenuOptions<unknown>,
        })
    },
    hideMenu: () =>
        set({
            visible: false,
            position: { x: 0, y: 0 },
            elementData: undefined,
            contextMenuOptions: undefined,
        }),
}))
