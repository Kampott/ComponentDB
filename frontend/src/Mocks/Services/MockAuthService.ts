import type IAuthService from '@/Interfaces/Services/IAuthService.ts'
import type {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    User,
} from '@Schemas'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'

export default class MockAuthService implements IAuthService {
    private readonly store: MockDataStore
    private currentUserId: number | null

    public constructor(store: MockDataStore) {
        this.store = store
        this.currentUserId = this.store.users[0]?.id ?? null
    }

    public async login(userData: LoginRequest): Promise<LoginResponse> {
        const user = this.store.users.find(
            item => item.email === userData.username,
        )
        if (!user) {
            throw new Error('User not found')
        }

        this.currentUserId = user.id

        return {
            access_token: `mock-access-${user.id}`,
            refresh_token: `mock-refresh-${user.id}`,
        }
    }

    public async register(
        userData: RegisterRequest,
    ): Promise<RegisterResponse> {
        const id = this.store.nextId('users')
        const newUser: User = {
            id: id,
            email: userData.username,
            level: userData.level,
        }

        this.store.users.push(newUser)
        this.currentUserId = id

        return { user_id: id }
    }

    public async logout(): Promise<void> {
        this.currentUserId = null
    }

    public async refresh(): Promise<LoginResponse> {
        const userId = this.currentUserId ?? this.store.users[0]?.id ?? 1
        return {
            access_token: `mock-access-${userId}`,
            refresh_token: `mock-refresh-${userId}`,
        }
    }

    public async me(): Promise<User> {
        const userId = this.currentUserId ?? this.store.users[0]?.id
        const user = this.store.users.find(item => item.id === userId)
        if (!user) {
            throw new Error('No authorized user')
        }

        return user
    }
}
