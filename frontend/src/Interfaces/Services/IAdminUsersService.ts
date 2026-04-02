import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    AdminUser,
    AdminUserAdd,
    adminUserSchema,
    AdminUserUpdate,
    InferListQuery,
    Role,
    UserRole,
    UserRoleAdd,
} from '@Schemas'

export default interface IAdminUsersService extends ICrudService<
    AdminUser,
    AdminUserAdd,
    AdminUserUpdate,
    InferListQuery<typeof adminUserSchema>
> {
    getUserRoles(userId: string | number): Promise<Role[]>

    assignRole(data: UserRoleAdd): Promise<UserRole>

    removeRole(userId: string | number, roleId: number): Promise<null>
}
