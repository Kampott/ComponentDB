import { create } from 'zustand/react'

import logError from '@/Utility/log_error.ts'
import type { LoginRequest, User } from '@Schemas'
import type { IUserStore } from '@Storage'
import { useServicesStore } from '@StorageImpl'

const ACTION_DISPLAY_MODE_STORAGE_KEY = 'actionDisplayMode'

function getInitialActionDisplayMode() {
    if (typeof window === 'undefined') {
        return 'text' as const
    }

    const savedMode = window.localStorage.getItem(
        ACTION_DISPLAY_MODE_STORAGE_KEY,
    )
    return savedMode === 'material' ? 'material' : 'text'
}

export const useUserStore = create<IUserStore>((set, get) => ({
    user: {} as User,
    isAuthenticated: false,
    actionDisplayMode: getInitialActionDisplayMode(),

    setUser(user: User) {
        set({ user: user })
    },

    setAuth(isAuthenticated: boolean) {
        set({ isAuthenticated: isAuthenticated })
    },

    setActionDisplayMode(mode) {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(ACTION_DISPLAY_MODE_STORAGE_KEY, mode)
        }
        set({ actionDisplayMode: mode })
    },

    toggleActionDisplayMode() {
        const nextMode =
            get().actionDisplayMode === 'material' ? 'text' : 'material'
        get().setActionDisplayMode(nextMode)
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
