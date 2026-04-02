import type IPermissionsService from '@/Interfaces/Services/IPermissionsService.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import EntityCrudService from '@Rest/Services/EntityCrudService.ts'
import { permissionSchema, type Permission, type PermissionAdd } from '@Schemas'

export default class PermissionsService
    extends EntityCrudService<typeof permissionSchema>
    implements IPermissionsService
{
    public constructor(client: RestApiClient) {
        super(client, permissionSchema)
    }

    public override async create(data: PermissionAdd): Promise<Permission> {
        return await this.client.post<PermissionAdd, Permission>(
            '/permissions/permissioncreate/',
            data,
        )
    }
}
