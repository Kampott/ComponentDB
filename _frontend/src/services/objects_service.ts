import type RestApiClient from "../http/RestApiClient.ts";
import AxiosClient from "../http/AxiosClient.ts";

class ObjectsService {
    private client: RestApiClient

    public constructor() {
        this.client = new AxiosClient("http://localhost:4040", {}, "http://localhost:8080");
    }

    // public async getRootObjects(): Promise<Object[]> {
    //     return await this.client.get<Object[]>("/root_objects")
    // }
}

export const objectsService = new ObjectsService()
