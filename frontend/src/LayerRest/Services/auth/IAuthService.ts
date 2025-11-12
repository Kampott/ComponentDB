import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    User,
} from '@RestSchemas'

export default interface IAuthService {
    login(userData: LoginRequest): Promise<LoginResponse>

    register(userData: RegisterRequest): Promise<RegisterResponse>

    logout(): Promise<void>

    refresh(): Promise<LoginResponse>

    me(): Promise<User>
}
