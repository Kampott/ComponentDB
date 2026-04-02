import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    Permission,
    Role,
    RoleAdd,
    RolePermission,
    RolePermissionAdd,
    roleSchema,
    RoleUpdate,
} from '@Schemas'

export default interface IRolesService extends ICrudService<
    Role,
    RoleAdd,
    RoleUpdate,
    InferListQuery<typeof roleSchema>
> {
    getRolePermissions(roleId: number): Promise<Permission[]>

    assignPermission(data: RolePermissionAdd): Promise<RolePermission>

    removePermission(roleId: number, permissionId: number): Promise<null>
}
