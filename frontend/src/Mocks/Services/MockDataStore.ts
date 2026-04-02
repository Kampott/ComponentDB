import type {
    AdminUser,
    Event,
    EventType,
    EventTypeTypeLink,
    InstanceProperty,
    Object as ObjectEntity,
    ObjectInstance,
    ObjectType,
    Permission,
    Property,
    PropertyType,
    ReplacementEvent,
    Role,
    RolePermission,
    User,
    UserRole,
} from '@Schemas'

type CounterKey =
    | 'users'
    | 'adminUsers'
    | 'roles'
    | 'permissions'
    | 'eventTypes'
    | 'events'
    | 'replacementEvents'
    | 'objectTypes'
    | 'objects'
    | 'objectInstances'
    | 'propertyTypes'
    | 'properties'
    | 'instanceProperties'

export default class MockDataStore {
    public readonly users: User[]
    public readonly adminUsers: AdminUser[]
    public readonly roles: Role[]
    public readonly permissions: Permission[]
    public userRoles: UserRole[]
    public rolePermissions: RolePermission[]
    public readonly eventTypes: EventType[]
    public readonly eventTypeRelations: EventTypeTypeLink[]
    public readonly events: Event[]
    public readonly replacementEvents: ReplacementEvent[]
    public readonly objectTypes: ObjectType[]
    public readonly objects: ObjectEntity[]
    public readonly objectInstances: ObjectInstance[]
    public readonly propertyTypes: PropertyType[]
    public readonly properties: Property[]
    public readonly instanceProperties: InstanceProperty[]

    private readonly counters: Record<CounterKey, number>

    public constructor() {
        this.users = [
            {
                id: 1,
                email: 'demo@local',
                level: 10,
                roles: [
                    {
                        id: 1,
                        name: 'Администратор',
                        permissions: [
                            { id: 1, name: 'manage_users' },
                            { id: 2, name: 'manage_roles' },
                            { id: 3, name: 'manage_permissions' },
                        ],
                    },
                ],
            },
        ]

        this.adminUsers = [
            { id: 1, email: 'demo@local', level: 10, is_active: true },
            { id: 2, email: 'viewer@local', level: 1, is_active: true },
        ]

        this.roles = [
            {
                id: 1,
                name: 'Администратор',
                description: 'Полный доступ к системе',
            },
            {
                id: 2,
                name: 'Оператор',
                description: 'Управление объектами и событиями',
            },
            { id: 3, name: 'Наблюдатель', description: 'Только чтение' },
        ]

        this.permissions = [
            {
                id: 1,
                name: 'manage_users',
                description: 'Управление пользователями',
            },
            { id: 2, name: 'manage_roles', description: 'Управление ролями' },
            {
                id: 3,
                name: 'manage_permissions',
                description: 'Управление правами доступа',
            },
            {
                id: 4,
                name: 'edit_objects',
                description: 'Редактирование объектов',
            },
            { id: 5, name: 'view_objects', description: 'Просмотр объектов' },
        ]

        this.userRoles = [
            { user_id: 1, role_id: 1 },
            { user_id: 2, role_id: 3 },
        ]

        this.rolePermissions = [
            { role_id: 1, permission_id: 1 },
            { role_id: 1, permission_id: 2 },
            { role_id: 1, permission_id: 3 },
            { role_id: 1, permission_id: 4 },
            { role_id: 1, permission_id: 5 },
            { role_id: 2, permission_id: 4 },
            { role_id: 2, permission_id: 5 },
            { role_id: 3, permission_id: 5 },
        ]

        this.eventTypes = [{ id: 1, name: 'Замена' }]
        this.eventTypeRelations = [{ event_type_id: 1, type_id: 1 }]
        this.events = []
        this.replacementEvents = []

        this.objectTypes = [
            { id: 1, name: 'Root Type', parent_id: null, root_id: 1 },
        ]
        this.objects = [
            {
                id: 1,
                name: 'Root Object',
                type_id: 1,
                parent_id: null,
                root_id: 1,
            },
        ]
        this.objectInstances = []
        this.propertyTypes = []
        this.properties = []
        this.instanceProperties = []

        this.counters = {
            users: this.users.length,
            adminUsers: this.adminUsers.length,
            roles: this.roles.length,
            permissions: this.permissions.length,
            eventTypes: this.eventTypes.length,
            events: this.events.length,
            replacementEvents: this.replacementEvents.length,
            objectTypes: this.objectTypes.length,
            objects: this.objects.length,
            objectInstances: this.objectInstances.length,
            propertyTypes: this.propertyTypes.length,
            properties: this.properties.length,
            instanceProperties: this.instanceProperties.length,
        }
    }

    public nextId(key: CounterKey): number {
        this.counters[key] += 1
        return this.counters[key]
    }
}
