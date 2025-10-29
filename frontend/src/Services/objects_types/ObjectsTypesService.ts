import type RestApiClient from '@/Http/RestApiClient.ts'
import type {
    ObjectType,
    ObjectTypeAdd,
    ObjectTypeUpdate,
} from '@/Schemas/ObjectType.ts'
import type IObjectsTypesService from './IObjectsTypesService.ts'

export default class ObjectsTypesService implements IObjectsTypesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getRootTypes(): Promise<ObjectType[]> {
        return await this.client.get<ObjectType[]>('/types/')
    }

    public async getTypeById(id: number): Promise<ObjectType> {
        return await this.client.get<ObjectType>(`/types/${id}`)
    }

    public async addType(object: ObjectTypeAdd): Promise<ObjectTypeAdd> {
        return await this.client.post<ObjectTypeAdd, ObjectTypeAdd>(
            '/types/',
            object,
        )
    }

    public async updateType(
        id: number,
        data: ObjectTypeUpdate,
    ): Promise<ObjectType> {
        return await this.client.patch<ObjectTypeUpdate, ObjectType>(
            `/types/${id}`,
            data,
        )
    }

    public async deleteType(id: number): Promise<null> {
        return await this.client.delete(`/types/${id}`)
    }

    public async getTypesByParentId(parentId: number): Promise<ObjectType[]> {
        return await this.client.get<ObjectType[]>('/types/', {
            parent_id: parentId,
        })
    }
}
