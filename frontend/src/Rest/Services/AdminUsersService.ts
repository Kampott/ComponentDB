import type IAdminUsersService from '@/Interfaces/Services/IAdminUsersService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    adminUserSchema,
    type Role,
    type UserRole,
    type UserRoleAdd,
} from '@Schemas'

export default class AdminUsersService
    extends EntityCrudService<typeof adminUserSchema>
    implements IAdminUsersService
{
    public constructor(client: RestApiClient) {
        super(client, adminUserSchema)
    }

    public async getUserRoles(userId: string | number): Promise<Role[]> {
        const relations = await this.client.get<UserRole[]>('/user_roles/', {
            user_id: userId,
        })
        const roleIds = relations.map(item => item.role_id)
        if (roleIds.length === 0) {
            return []
        }

        return await this.client.get<Role[]>('/roles/', {
            id__in: roleIds,
        })
    }

    public async assignRole(data: UserRoleAdd): Promise<UserRole> {
        return await this.client.post<UserRoleAdd, UserRole>(
            `/user_roles/users/${data.user_id}/roles/`,
            data,
        )
    }

    public async removeRole(
        userId: string | number,
        roleId: number,
    ): Promise<null> {
        return await this.client.delete(`/user_roles/${userId}/${roleId}`)
    }
}
