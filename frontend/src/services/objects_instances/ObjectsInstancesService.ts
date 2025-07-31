import type RestApiClient from "../../http/RestApiClient.ts";
import type {ObjectInstance, ObjectInstanceAdd} from "../../schemas/ObjectInstance.ts";
import type IObjectsInstancesService from "./IObjectsInstancesService.ts";

export default class ObjectsInstancesService implements IObjectsInstancesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getInstances(): Promise<ObjectInstance[]> {
        return await this.client.get<ObjectInstance[]>("/instances/")
    }

    public async getInstanceById(id: string): Promise<ObjectInstance> {
        return await this.client.get<ObjectInstance>(`/instances/${id}`);
    }

    public async addInstance(object: ObjectInstanceAdd): Promise<ObjectInstanceAdd> {
        return await this.client.post<ObjectInstanceAdd, ObjectInstanceAdd>("/instances/", object);
    }

    public async deleteInstance(id: string): Promise<null> {
        return await this.client.delete(`/instances/${id}`);
    }
}
