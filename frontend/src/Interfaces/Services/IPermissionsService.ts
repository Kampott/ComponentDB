import type { ICrudService } from '@/Interfaces/Services/CrudInterfaces.ts'
import type {
    InferListQuery,
    Permission,
    PermissionAdd,
    permissionSchema,
    PermissionUpdate,
} from '@Schemas'

export default interface IPermissionsService extends ICrudService<
    Permission,
    PermissionAdd,
    PermissionUpdate,
    InferListQuery<typeof permissionSchema>
> {}
