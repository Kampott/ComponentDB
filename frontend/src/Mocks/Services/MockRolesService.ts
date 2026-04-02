import type IRolesService from '@/Interfaces/Services/IRolesService.ts'
import type MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type {
    InferListQuery,
    Permission,
    Role,
    RoleAdd,
    RolePermission,
    RolePermissionAdd,
    RoleUpdate,
    roleSchema,
} from '@Schemas'

export default class MockRolesService implements IRolesService {
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        this.store = store
    }

    public async list(
        _query?: InferListQuery<typeof roleSchema>,
    ): Promise<Role[]> {
        return this.store.roles
    }

    public async read(id: number): Promise<Role> {
        const role = this.store.roles.find(r => r.id === id)
        if (!role) throw new Error(`Role #${id} not found`)
        return role
    }

    public async create(data: RoleAdd): Promise<Role> {
        const id = this.store.nextId('roles')
        const role: Role = {
            id,
            name: data.name,
            description: data.description ?? '',
        }
        this.store.roles.push(role)
        return role
    }

    public async update(id: number, data: RoleUpdate): Promise<Role> {
        const role = this.store.roles.find(r => r.id === id)
        if (!role) throw new Error(`Role #${id} not found`)
        if (data.name !== undefined) role.name = data.name
        if (data.description !== undefined) role.description = data.description
        return role
    }

    public async delete(id: number): Promise<null> {
        const idx = this.store.roles.findIndex(r => r.id === id)
        if (idx !== -1) this.store.roles.splice(idx, 1)
        this.store.rolePermissions = this.store.rolePermissions.filter(
            rp => rp.role_id !== id,
        )
        this.store.userRoles = this.store.userRoles.filter(
            ur => ur.role_id !== id,
        )
        return null
    }

    public async getRolePermissions(roleId: number): Promise<Permission[]> {
        const permIds = this.store.rolePermissions
            .filter(rp => rp.role_id === roleId)
            .map(rp => rp.permission_id)
        return this.store.permissions.filter(p => permIds.includes(p.id))
    }

    public async assignPermission(
        data: RolePermissionAdd,
    ): Promise<RolePermission> {
        this.store.rolePermissions.push(data)
        return data
    }

    public async removePermission(
        roleId: number,
        permissionId: number,
    ): Promise<null> {
        const idx = this.store.rolePermissions.findIndex(
            rp => rp.role_id === roleId && rp.permission_id === permissionId,
        )
        if (idx !== -1) this.store.rolePermissions.splice(idx, 1)
        return null
    }
}
