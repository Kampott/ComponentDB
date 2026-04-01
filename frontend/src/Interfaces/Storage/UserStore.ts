import type { LoginRequest, User } from '@Schemas'

export type ActionDisplayMode = 'material' | 'text'

export interface IUserStore {
    user: User
    isAuthenticated: boolean
    actionDisplayMode: ActionDisplayMode

    setUser(user: User): void

    setAuth(isAuthenticated: boolean): void

    setActionDisplayMode(mode: ActionDisplayMode): void

    toggleActionDisplayMode(): void

    login(userData: LoginRequest): Promise<void>

    logout(): Promise<void>

    checkAuth(): Promise<void>
}
