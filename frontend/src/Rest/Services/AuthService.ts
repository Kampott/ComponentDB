import type IAuthService from '@/Interfaces/Services/IAuthService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    LoginRequest,
    LoginResponse,
    Permission,
    RegisterRequest,
    RegisterResponse,
    Role,
    RolePermission,
    User,
    UserAdminCapabilities,
    UserRole,
    UserRoleInfo,
} from '@Schemas'

type RestCurrentUser = {
    id: string
    email: string
}

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
            {
                email: userData.email,
                password: userData.password,
            },
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
        const user = await this.client.get<RestCurrentUser>('/user/me')

        const roles = await this.tryLoadCurrentUserRoles(user.id)
        const adminCapabilities = this.resolveAdminCapabilities(roles)

        return {
            ...user,
            roles,
            adminCapabilities:
                adminCapabilities.canAccessAdmin || roles
                    ? adminCapabilities
                    : await this.probeAdminCapabilities(),
        }
    }

    private async tryLoadCurrentUserRoles(
        userId: string,
    ): Promise<UserRoleInfo[] | undefined> {
        try {
            const assignments = await this.client.get<UserRole[]>(
                '/user_roles/',
                { user_id: userId },
            )
            const roleIds = [...new Set(assignments.map(item => item.role_id))]
            if (roleIds.length === 0) {
                return []
            }

            const [roles, rolePermissions, permissions] = await Promise.all([
                this.client.get<Role[]>('/roles/', {
                    id__in: roleIds,
                }),
                this.client.get<RolePermission[]>('/role_permissions/', {
                    role_id__in: roleIds,
                }),
                this.client.get<Permission[]>('/permissions/'),
            ])

            const permissionsById = new Map(
                permissions.map(permission => [permission.id, permission]),
            )
            const permissionIdsByRoleId = new Map<number, number[]>()

            for (const relation of rolePermissions) {
                const existing =
                    permissionIdsByRoleId.get(relation.role_id) ?? []
                existing.push(relation.permission_id)
                permissionIdsByRoleId.set(relation.role_id, existing)
            }

            return roles.map(role => ({
                id: role.id,
                name: role.name,
                permissions: (permissionIdsByRoleId.get(role.id) ?? []).flatMap(
                    permissionId => {
                        const permission = permissionsById.get(permissionId)
                        return permission
                            ? [{ id: permission.id, name: permission.name }]
                            : []
                    },
                ),
            }))
        } catch {
            return undefined
        }
    }

    private resolveAdminCapabilities(
        roles?: UserRoleInfo[],
    ): UserAdminCapabilities {
        const permissions = new Set(
            (roles ?? []).flatMap(role =>
                role.permissions.map(permission => permission.name),
            ),
        )
        const canReadRoles =
            permissions.has('SUPER_PERMISSION') ||
            permissions.has('manage_roles') ||
            permissions.has('read_role')
        const canManageRoles =
            permissions.has('SUPER_PERMISSION') ||
            permissions.has('manage_roles') ||
            permissions.has('create_role') ||
            permissions.has('edit_role') ||
            permissions.has('delete_role')
        const canReadPermissions =
            permissions.has('SUPER_PERMISSION') ||
            permissions.has('manage_permissions') ||
            permissions.has('read_permission')
        const canManagePermissions =
            permissions.has('SUPER_PERMISSION') ||
            permissions.has('manage_permissions') ||
            permissions.has('create_permission') ||
            permissions.has('edit_permission') ||
            permissions.has('delete_permission') ||
            permissions.has('create_role_permission') ||
            permissions.has('delete_role_permission')
        const canManageUsers =
            permissions.has('SUPER_PERMISSION') ||
            permissions.has('manage_users') ||
            permissions.has('read_users') ||
            permissions.has('register_user') ||
            permissions.has('create_user_role') ||
            permissions.has('delete_role')

        return {
            canReadRoles,
            canManageRoles,
            canReadPermissions,
            canManagePermissions,
            canManageUsers,
            canAccessAdmin:
                canReadRoles ||
                canManageRoles ||
                canReadPermissions ||
                canManagePermissions ||
                canManageUsers,
        }
    }

    private async probeAdminCapabilities(): Promise<UserAdminCapabilities> {
        const [rolesReadable, permissionsReadable] = await Promise.all([
            this.canRead('/roles/'),
            this.canRead('/permissions/'),
        ])

        return {
            canReadRoles: rolesReadable,
            canManageRoles: false,
            canReadPermissions: permissionsReadable,
            canManagePermissions: false,
            canManageUsers: false,
            canAccessAdmin: rolesReadable || permissionsReadable,
        }
    }

    private async canRead(path: string): Promise<boolean> {
        try {
            await this.client.get(path)
            return true
        } catch {
            return false
        }
    }
}
