import type { LoginRequest, User } from '@/Schemas/Auth.ts'

export default interface IUserStore {
    user: User
    isAuthenticated: boolean

    setUser(user: User): void

    setAuth(isAuthenticated: boolean): void

    login(userData: LoginRequest): Promise<void>

    logout(): Promise<void>

    checkAuth(): Promise<void>
}
