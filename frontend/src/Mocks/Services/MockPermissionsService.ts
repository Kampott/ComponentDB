import type IPermissionsService from '@/Interfaces/Services/IPermissionsService.ts'
import type MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import type {
    InferListQuery,
    Permission,
    PermissionAdd,
    PermissionUpdate,
    permissionSchema,
} from '@Schemas'

export default class MockPermissionsService implements IPermissionsService {
    private readonly store: MockDataStore

    public constructor(store: MockDataStore) {
        this.store = store
    }

    public async list(
        _query?: InferListQuery<typeof permissionSchema>,
    ): Promise<Permission[]> {
        return this.store.permissions
    }

    public async read(id: number): Promise<Permission> {
        const perm = this.store.permissions.find(p => p.id === id)
        if (!perm) throw new Error(`Permission #${id} not found`)
        return perm
    }

    public async create(data: PermissionAdd): Promise<Permission> {
        const id = this.store.nextId('permissions')
        const perm: Permission = {
            id,
            name: data.name,
            description: data.description ?? '',
        }
        this.store.permissions.push(perm)
        return perm
    }

    public async update(
        id: number,
        data: PermissionUpdate,
    ): Promise<Permission> {
        const perm = this.store.permissions.find(p => p.id === id)
        if (!perm) throw new Error(`Permission #${id} not found`)
        if (data.name !== undefined) perm.name = data.name
        if (data.description !== undefined) perm.description = data.description
        return perm
    }

    public async delete(id: number): Promise<null> {
        const idx = this.store.permissions.findIndex(p => p.id === id)
        if (idx !== -1) this.store.permissions.splice(idx, 1)
        this.store.rolePermissions = this.store.rolePermissions.filter(
            rp => rp.permission_id !== id,
        )
        return null
    }
}
