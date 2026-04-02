import { create } from 'zustand/react'

import logError from '@/Utility/log_error.ts'
import type { LoginRequest, User } from '@Schemas'
import type { IUserStore, ThemeMode } from '@Storage'
import { useServicesStore } from '@StorageImpl'

const ACTION_DISPLAY_MODE_STORAGE_KEY = 'actionDisplayMode'
const THEME_MODE_STORAGE_KEY = 'themeMode'

function getInitialActionDisplayMode() {
    if (typeof window === 'undefined') {
        return 'text' as const
    }

    const savedMode = window.localStorage.getItem(
        ACTION_DISPLAY_MODE_STORAGE_KEY,
    )
    return savedMode === 'material' ? 'material' : 'text'
}

function getInitialThemeMode(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'light'
    }

    const savedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
    if (savedMode === 'dark' || savedMode === 'light') {
        return savedMode
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

function syncThemeMode(mode: ThemeMode) {
    if (typeof document === 'undefined') {
        return
    }

    document.documentElement.classList.toggle('dark', mode === 'dark')
}

const initialThemeMode = getInitialThemeMode()
syncThemeMode(initialThemeMode)

export const useUserStore = create<IUserStore>((set, get) => ({
    user: {} as User,
    isAuthenticated: false,
    authResolved: false,
    actionDisplayMode: getInitialActionDisplayMode(),
    themeMode: initialThemeMode,

    setUser(user: User) {
        set({ user: user })
    },

    setAuth(isAuthenticated: boolean) {
        set({ isAuthenticated: isAuthenticated })
    },

    setAuthResolved(authResolved: boolean) {
        set({ authResolved: authResolved })
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

    setThemeMode(mode) {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
        }
        syncThemeMode(mode)
        set({ themeMode: mode })
    },

    toggleThemeMode() {
        const nextMode = get().themeMode === 'dark' ? 'light' : 'dark'
        get().setThemeMode(nextMode)
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
        store.setAuthResolved(true)
    },

    async logout() {
        try {
            await useServicesStore.getState().services.authService.logout()
            localStorage.removeItem('token')

            const store = get()
            store.setAuth(false)
            store.setUser({} as User)
            store.setAuthResolved(true)
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
            localStorage.removeItem('token')
            const store = get()
            store.setAuth(false)
            store.setUser({} as User)
            logError(e)
        } finally {
            get().setAuthResolved(true)
        }
    },
}))
