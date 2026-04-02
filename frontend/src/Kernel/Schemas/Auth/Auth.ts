export interface LoginRequest {
    username: string
    password: string
}

export interface LoginResponse {
    access_token: string
    refresh_token?: string
}

export interface RegisterRequest {
    email: string
    password: string
}

export interface RegisterResponse {
    id: string | number
    email: string
    is_active?: boolean
    created_at?: string
}

export interface UserAdminCapabilities {
    canReadRoles: boolean
    canManageRoles: boolean
    canReadPermissions: boolean
    canManagePermissions: boolean
    canManageUsers: boolean
    canAccessAdmin: boolean
}

export interface User {
    id: string | number
    email: string
    level?: number | null
    roles?: UserRoleInfo[]
    adminCapabilities?: UserAdminCapabilities
}

export interface UserRoleInfo {
    id: number
    name: string
    permissions: UserPermissionInfo[]
}

export interface UserPermissionInfo {
    id: number
    name: string
}
