import type IAuthService from '@/Interfaces/Services/IAuthService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    User,
} from '@Schemas'

export default class AuthService implements IAuthService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    async login(userData: LoginRequest): Promise<LoginResponse> {
        return await this.client.post<LoginRequest, LoginResponse>(
            '/auth/login',
            userData,
            {},
            { 'Content-Type': ['application/x-www-form-urlencoded'] },
        )
    }

    async register(userData: RegisterRequest): Promise<RegisterResponse> {
        return await this.client.post<RegisterRequest, RegisterResponse>(
            '/auth/register',
            userData,
        )
    }

    async logout(): Promise<void> {
        return await this.client.delete('/auth/logout')
    }

    async refresh(): Promise<LoginResponse> {
        return await this.client.post<null, LoginResponse>(
            '/auth/refresh',
            null,
        )
    }

    async me(): Promise<User> {
        return await this.client.get<User>('/user/me')
    }
}
