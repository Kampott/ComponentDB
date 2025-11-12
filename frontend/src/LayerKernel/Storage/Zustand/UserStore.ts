import { create } from 'zustand/react'

import type { IUserStore } from '@/LayerKernel/Storage/Interfaces'
import { useServicesStore } from '@/LayerKernel/Storage/Zustand/index.ts'
import logError from '@/Utility/log_error.ts'
import type { LoginRequest, User } from '@RestSchemas'

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
