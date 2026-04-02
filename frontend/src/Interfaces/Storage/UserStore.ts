import type { LoginRequest, User } from '@Schemas'

export type ActionDisplayMode = 'material' | 'text'
export type ThemeMode = 'light' | 'dark'

export interface IUserStore {
    user: User
    isAuthenticated: boolean
    authResolved: boolean
    actionDisplayMode: ActionDisplayMode
    themeMode: ThemeMode

    setUser(user: User): void

    setAuth(isAuthenticated: boolean): void

    setAuthResolved(authResolved: boolean): void

    setActionDisplayMode(mode: ActionDisplayMode): void

    toggleActionDisplayMode(): void

    setThemeMode(mode: ThemeMode): void

    toggleThemeMode(): void

    login(userData: LoginRequest): Promise<void>

    logout(): Promise<void>

    checkAuth(): Promise<void>
}
