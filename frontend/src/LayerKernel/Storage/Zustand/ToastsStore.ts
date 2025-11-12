import { create } from 'zustand/react'

import type { IToastsStore } from '@/LayerKernel/Storage/Interfaces'

export const useToastStore = create<IToastsStore>(set => ({
    toasts: [],

    addToast(header: string, message: string) {
        set(state => ({
            toasts: [
                ...state.toasts,
                { id: Date.now(), header: header, message: message },
            ],
        }))
    },

    removeToast(id: number): void {
        set(state => ({
            toasts: state.toasts.filter(t => t.id !== id),
        }))
    },
}))
