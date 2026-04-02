import type { User } from '@Schemas'

const MOCK_ADMIN_PERMISSIONS = [
    'manage_users',
    'manage_roles',
    'manage_permissions',
] as const

const ROLE_READ_PERMISSIONS = [
    'SUPER_PERMISSION',
    'manage_roles',
    'read_role',
] as const

const ROLE_MANAGE_PERMISSIONS = [
    'SUPER_PERMISSION',
    'manage_roles',
    'create_role',
    'edit_role',
    'delete_role',
] as const

const PERMISSION_READ_PERMISSIONS = [
    'SUPER_PERMISSION',
    'manage_permissions',
    'read_permission',
] as const

const PERMISSION_MANAGE_PERMISSIONS = [
    'SUPER_PERMISSION',
    'manage_permissions',
    'create_permission',
    'edit_permission',
    'delete_permission',
    'create_role_permission',
    'delete_role_permission',
] as const

const USER_MANAGE_PERMISSIONS = [
    'SUPER_PERMISSION',
    'manage_users',
    'read_users',
    'register_user',
    'read_user_role',
    'create_user_role',
    'edit_user_role',
    'delete_user_role',
] as const

export type AdminPermission = (typeof MOCK_ADMIN_PERMISSIONS)[number]

function getUserPermissionNames(user: User): Set<string> {
    return new Set(
        (user.roles ?? []).flatMap(role =>
            role.permissions.map(permission => permission.name),
        ),
    )
}

function userHasAnyKnownPermission(
    user: User,
    permissions: readonly string[],
): boolean {
    const permissionNames = getUserPermissionNames(user)
    return permissions.some(permission => permissionNames.has(permission))
}

export function userHasPermission(
    user: User,
    permission: AdminPermission,
): boolean {
    return userHasAnyKnownPermission(user, [permission])
}

export function userCanReadRoles(user: User): boolean {
    return (
        userHasAnyKnownPermission(user, ROLE_READ_PERMISSIONS) ||
        user.adminCapabilities?.canReadRoles === true
    )
}

export function userCanManageRoles(user: User): boolean {
    return (
        userHasAnyKnownPermission(user, ROLE_MANAGE_PERMISSIONS) ||
        user.adminCapabilities?.canManageRoles === true
    )
}

export function userCanReadPermissions(user: User): boolean {
    return (
        userHasAnyKnownPermission(user, PERMISSION_READ_PERMISSIONS) ||
        user.adminCapabilities?.canReadPermissions === true
    )
}

export function userCanManagePermissions(user: User): boolean {
    return (
        userHasAnyKnownPermission(user, PERMISSION_MANAGE_PERMISSIONS) ||
        user.adminCapabilities?.canManagePermissions === true
    )
}

export function userCanManageUsers(user: User): boolean {
    return (
        userHasAnyKnownPermission(user, USER_MANAGE_PERMISSIONS) ||
        user.adminCapabilities?.canManageUsers === true
    )
}

export function userCanAccessAdmin(user: User): boolean {
    return (
        userCanManageUsers(user) ||
        userCanReadRoles(user) ||
        userCanReadPermissions(user) ||
        user.adminCapabilities?.canAccessAdmin === true
    )
}
