import type IRolesService from '@/Interfaces/Services/IRolesService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import {
    roleSchema,
    type Permission,
    type Role,
    type RoleAdd,
    type RolePermission,
    type RolePermissionAdd,
} from '@Schemas'

export default class RolesService
    extends EntityCrudService<typeof roleSchema>
    implements IRolesService
{
    public constructor(client: RestApiClient) {
        super(client, roleSchema)
    }

    public async getRolePermissions(roleId: number): Promise<Permission[]> {
        const relations = await this.client.get<RolePermission[]>(
            '/role_permissions/',
            { role_id: roleId },
        )

        const permissionIds = relations.map(item => item.permission_id)
        if (permissionIds.length === 0) {
            return []
        }

        return await this.client.get<Permission[]>('/permissions/', {
            id__in: permissionIds,
        })
    }

    public override async create(data: RoleAdd): Promise<Role> {
        return await this.client.post<RoleAdd, Role>('/roles/rolecreate/', data)
    }

    public async assignPermission(
        data: RolePermissionAdd,
    ): Promise<RolePermission> {
        return await this.client.post<RolePermissionAdd, RolePermission>(
            `/role_permissions/roles/${data.role_id}/permission/`,
            data,
        )
    }

    public async removePermission(
        roleId: number,
        permissionId: number,
    ): Promise<null> {
        return await this.client.delete(
            `/role_permissions/${roleId}/${permissionId}`,
        )
    }
}
