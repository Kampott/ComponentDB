import type RestApiClient from "../../http/RestApiClient.ts";
import type {InstanceProperty, InstancePropertyAdd} from "../../schemas/InstanceProperty.ts";
import type IInstancesPropertiesService from "./IInstancesPropertiesService.ts";

export default class InstancesPropertiesService implements IInstancesPropertiesService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getInstancesProperties(): Promise<InstanceProperty[]> {
        return await this.client.get<InstanceProperty[]>("/instanceproperties/")
    }

    public async getInstancePropertyById(id: number): Promise<InstanceProperty> {
        return await this.client.get<InstanceProperty>(`/instanceproperties/${id}`);
    }

    public async addInstanceProperty(object: InstancePropertyAdd): Promise<InstancePropertyAdd> {
        return await this.client.post<InstancePropertyAdd, InstancePropertyAdd>("/instanceproperties/", object);
    }

    public async deleteInstanceProperty(id: number): Promise<null> {
        return await this.client.delete(`/instanceproperties/${id}`);
    }

    public async getInstancesPropertiesByInstanceId(instanceId: number): Promise<InstanceProperty[]> {
        return await this.client.get<InstanceProperty[]>(`/instanceproperties/`, {instance_id: instanceId});
    }
}
