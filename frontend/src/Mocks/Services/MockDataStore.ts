import type {
    InstanceProperty,
    Object as ObjectEntity,
    ObjectInstance,
    ObjectType,
    Property,
    PropertyType,
    User,
} from '@Schemas'

type CounterKey =
    | 'users'
    | 'objectTypes'
    | 'objects'
    | 'objectInstances'
    | 'propertyTypes'
    | 'properties'
    | 'instanceProperties'

export default class MockDataStore {
    public readonly users: User[]
    public readonly objectTypes: ObjectType[]
    public readonly objects: ObjectEntity[]
    public readonly objectInstances: ObjectInstance[]
    public readonly propertyTypes: PropertyType[]
    public readonly properties: Property[]
    public readonly instanceProperties: InstanceProperty[]

    private readonly counters: Record<CounterKey, number>

    public constructor() {
        this.users = [{ id: 1, email: 'demo@local', level: 10 }]

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
