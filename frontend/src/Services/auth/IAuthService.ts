import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    User,
} from '@/Schemas/Auth.ts'

export default interface IAuthService {
    login(userData: LoginRequest): Promise<LoginResponse>

    register(userData: RegisterRequest): Promise<RegisterResponse>

    logout(): Promise<void>

    refresh(): Promise<LoginResponse>

    me(): Promise<User>
}
