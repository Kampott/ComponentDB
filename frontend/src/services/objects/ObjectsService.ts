import type RestApiClient from "../../http/RestApiClient.ts";
import type {Object, ObjectAdd, ObjectUpdate} from "../../schemas/Object.ts";
import type { ObjectInstance } from "../../schemas/ObjectInstance.ts";
import type IObjectsService from "./IObjectsService.ts";

export default class ObjectsService implements IObjectsService {
    private client: RestApiClient

    public constructor(client: RestApiClient) {
        this.client = client
    }

    public async getObjects(): Promise<Object[]> {
        return await this.client.get<Object[]>("/objects/")
    }

    public async getObjectById(id: number): Promise<Object> {
        return await this.client.get<Object>(`/objects/${id}`);
    }

    public async addObject(object: ObjectAdd): Promise<ObjectAdd> {
        return await this.client.post<ObjectAdd, ObjectAdd>("/objects/", object);
    }

    public async updateObject(id: number, data: ObjectUpdate): Promise<Object> {
        return await this.client.patch<ObjectUpdate, Object>(`/objects/${id}`, data);
    }

    public async deleteObject(id: number): Promise<null> {
        return await this.client.delete(`/objects/${id}`);
    }

    public async getObjectsByParentId(parentId: number): Promise<Object[]> {
        return await this.client.get<Object[]>("/objects/", {parent_id: parentId})
    }

    public async getObjectsByTypeId(typeId: number): Promise<Object[]> {
        return await this.client.get<Object[]>("/objects/", {type_id: typeId})
    }

    public async createInstance(rootObjectId: number): Promise<ObjectInstance> {
        return await this.client.post(`/objects/${rootObjectId}/instance`, {});
    }
}
