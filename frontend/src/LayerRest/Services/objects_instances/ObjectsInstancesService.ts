import type RestApiClient from '@Rest/RestApiClient.ts'
import type {
    ObjectInstance,
    ObjectInstanceAdd,
    ObjectInstanceUpdate,
} from '@RestSchemas'
import type IObjectsInstancesService from './IObjectsInstancesService.ts'

export default class ObjectsInstancesService implements IObjectsInstancesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getInstances(): Promise<ObjectInstance[]> {
        return await this.client.get<ObjectInstance[]>('/instances/')
    }

    public async getInstanceById(id: number): Promise<ObjectInstance> {
        return await this.client.get<ObjectInstance>(`/instances/${id}`)
    }

    public async addInstance(
        object: ObjectInstanceAdd,
    ): Promise<ObjectInstance> {
        return await this.client.post<ObjectInstanceAdd, ObjectInstance>(
            '/instances/',
            object,
        )
    }

    public async updateInstance(
        id: number,
        data: ObjectInstanceUpdate,
    ): Promise<ObjectInstance> {
        return await this.client.patch<ObjectInstanceUpdate, ObjectInstance>(
            `/instances/${id}`,
            data,
        )
    }

    public async deleteInstance(id: number): Promise<null> {
        return await this.client.delete(`/instances/${id}`)
    }

    public async getInstancesByObjectId(
        objectId: number,
    ): Promise<ObjectInstance[]> {
        return await this.client.get<ObjectInstance[]>('/instances/', {
            object_id: objectId,
        })
    }

    public async getInstancesByParentId(
        parentId: number,
    ): Promise<ObjectInstance[]> {
        return await this.client.get<ObjectInstance[]>('/instances/', {
            parent_id: parentId,
        })
    }
}
