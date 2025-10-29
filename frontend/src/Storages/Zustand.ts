import { create } from 'zustand/react'

import logError from '@/log_error.ts'
import type { LoginRequest, User } from '@/Schemas/Auth'
import Services from '@/Services/Services.ts'
import type IContextMenuStore from '@/Storages/IContextMenuStore.ts'
import type { ContextMenuOptions } from '@/Storages/IContextMenuStore.ts'
import type { MouseEvent } from 'react'
import type IServicesStore from './IServicesStore.ts'
import type IToastsStore from './IToastsStore.ts'
import type IUserStore from './IUserStore.ts'

export const useServicesStore = create<IServicesStore>(() => ({
    services: new Services(),
}))

export const useUserStore = create<IUserStore>((set, get) => ({
    user: {} as User,
    isAuthenticated: false,

    setUser(user: User) {
        set({ user: user })
    },

    setAuth(isAuthenticated: boolean) {
        set({ isAuthenticated: isAuthenticated })
    },

    async login(userData: LoginRequest) {
        const response = await useServicesStore
            .getState()
            .services.authService.login(userData)
        localStorage.setItem('token', response.access_token)

        const store = get()
        store.setAuth(true)
        store.setUser(
            await useServicesStore.getState().services.authService.me(),
        )
    },

    async logout() {
        try {
            await useServicesStore.getState().services.authService.logout()
            localStorage.removeItem('token')

            const store = get()
            store.setAuth(false)
            store.setUser({} as User)
        } catch (e: unknown) {
            logError(e)
        }
    },

    async checkAuth() {
        try {
            const response = await useServicesStore
                .getState()
                .services.authService.refresh()
            localStorage.setItem('token', response.access_token)
            const store = get()
            store.setAuth(true)
            store.setUser(
                await useServicesStore.getState().services.authService.me(),
            )
        } catch (e) {
            logError(e)
        }
    },
}))

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
        console.info('onContextMenuCall called')
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
