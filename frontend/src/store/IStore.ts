import type {LoginRequest, User} from "../models/auth.ts";
import type Services from "../services/Services.ts";

export default interface IStore {
    services: Services
    user: User
    isAuthenticated: boolean

    setUser(user: User): void

    setAuth(isAuthenticated: boolean): void

    login(userData: LoginRequest): Promise<void>

    logout(): Promise<void>

    checkAuth(): Promise<void>
}
