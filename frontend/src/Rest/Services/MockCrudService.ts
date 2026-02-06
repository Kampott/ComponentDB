import type {
    CrudQuery,
    ICrudService,
} from '@/Interfaces/Services/CrudInterfaces.ts'

export default abstract class MockCrudService<
    Entity extends { id: number },
    CreateData,
    UpdateData,
> implements ICrudService<Entity, CreateData, UpdateData> {
    private readonly entities: Entity[]

    protected constructor(entities: Entity[]) {
        this.entities = entities
    }

    public async list(query?: CrudQuery): Promise<Entity[]> {
        if (!query) {
            return [...this.entities]
        }

        return this.entities.filter(entity => {
            const indexedEntity = entity as Record<string, unknown>

            for (const [key, value] of Object.entries(query)) {
                if (String(indexedEntity[key]) !== String(value)) {
                    return false
                }
            }

            return true
        })
    }

    public async read(id: number): Promise<Entity> {
        const entity = this.entities.find(item => item.id === id)
        if (!entity) {
            throw new Error(`Entity with id=${id} not found`)
        }

        return entity
    }

    public abstract create(data: CreateData): Promise<Entity>

    public async update(id: number, data: UpdateData): Promise<Entity> {
        const entity = await this.read(id)
        Object.assign(entity, data)
        return entity
    }

    public async delete(id: number): Promise<null> {
        const index = this.entities.findIndex(item => item.id === id)
        if (index >= 0) {
            this.entities.splice(index, 1)
        }
        return null
    }

    protected pushEntity(entity: Entity): Entity {
        this.entities.push(entity)
        return entity
    }
}
