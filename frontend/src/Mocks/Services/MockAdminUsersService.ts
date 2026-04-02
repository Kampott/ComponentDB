import type IAdminUsersService from '@/Interfaces/Services/IAdminUsersService.ts'
import type MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type {
    AdminUser,
    AdminUserAdd,
    AdminUserUpdate,
    InferListQuery,
    Role,
    UserRole,
    UserRoleAdd,
    adminUserSchema,
} from '@Schemas'

export default class MockAdminUsersService implements IAdminUsersService {
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        this.store = store
    }

    public async list(
        _query?: InferListQuery<typeof adminUserSchema>,
    ): Promise<AdminUser[]> {
        return this.store.adminUsers
    }

    public async read(id: number): Promise<AdminUser> {
        const user = this.store.adminUsers.find(u => u.id === id)
        if (!user) throw new Error(`User #${id} not found`)
        return user
    }

    public async create(data: AdminUserAdd): Promise<AdminUser> {
        const id = this.store.nextId('adminUsers')
        const user: AdminUser = {
            id,
            email: data.email,
            level: data.level,
            is_active: data.is_active ?? true,
        }
        this.store.adminUsers.push(user)
        return user
    }

    public async update(id: number, data: AdminUserUpdate): Promise<AdminUser> {
        const user = this.store.adminUsers.find(u => u.id === id)
        if (!user) throw new Error(`User #${id} not found`)
        if (data.email !== undefined) user.email = data.email
        if (data.level !== undefined) user.level = data.level
        if (data.is_active !== undefined) user.is_active = data.is_active
        return user
    }

    public async delete(id: number): Promise<null> {
        const idx = this.store.adminUsers.findIndex(u => u.id === id)
        if (idx !== -1) this.store.adminUsers.splice(idx, 1)
        return null
    }

    public async getUserRoles(userId: number): Promise<Role[]> {
        const roleIds = this.store.userRoles
            .filter(ur => ur.user_id === userId)
            .map(ur => ur.role_id)
        return this.store.roles.filter(r => roleIds.includes(r.id))
    }

    public async assignRole(data: UserRoleAdd): Promise<UserRole> {
        this.store.userRoles.push(data)
        return data
    }

    public async removeRole(userId: number, roleId: number): Promise<null> {
        const idx = this.store.userRoles.findIndex(
            ur => ur.user_id === userId && ur.role_id === roleId,
        )
        if (idx !== -1) this.store.userRoles.splice(idx, 1)
        return null
    }
}
