import type RestApiClient from "../../http/RestApiClient.ts";
import type {InstanceProperty, InstancePropertyAdd} from "../../schemas/InstanceProperty.ts";
import type IInstancesPropertiesService from "./IInstancesPropertiesService.ts";

export default class InstancesPropertiesService implements IInstancesPropertiesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getInstances(): Promise<InstanceProperty[]> {
        return await this.client.get<InstanceProperty[]>("/instanceproperties/")
    }

    public async getInstanceById(id: string): Promise<InstanceProperty> {
        return await this.client.get<InstanceProperty>(`/instanceproperties/${id}`);
    }

    public async addInstance(object: InstancePropertyAdd): Promise<InstancePropertyAdd> {
        return await this.client.post<InstancePropertyAdd, InstancePropertyAdd>("/instanceproperties/", object);
    }

    public async deleteInstance(id: string): Promise<null> {
        return await this.client.delete(`/instanceproperties/${id}`);
    }
}
