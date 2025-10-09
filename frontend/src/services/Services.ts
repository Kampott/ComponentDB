import type RestApiClient from "../http/RestApiClient.ts";
import type IAuthService from "./auth/IAuthService.ts";
import type IInstancesPropertiesService from "./instances_properties/IInstancesPropertiesService.ts";
import type IObjectsService from "./objects/IObjectsService.ts";
import type IObjectsInstancesService from "./objects_instances/IObjectsInstancesService.ts";
import type IObjectsTypesService from "./objects_types/IObjectsTypesService.ts";
import type IPropertiesService from "./properties/IPropertiesService.ts";
import type IPropertiesTypesService from "./properties_types/IPropertiesTypesService.ts";
import AxiosClient from "../http/AxiosClient.ts";
import AuthService from "./auth/AuthService.ts";
import InstancesPropertiesService from "./instances_properties/InstancesPropertiesService.ts";
import ObjectsService from "./objects/ObjectsService.ts";
import ObjectsInstancesService from "./objects_instances/ObjectsInstancesService.ts";
import ObjectsTypesService from "./objects_types/ObjectsTypesService.ts";
import PropertiesService from "./properties/PropertiesService.ts";
import PropertiesTypesService from "./properties_types/PropertiesTypesService.ts";

export default class Services {
    public readonly restApiClient: RestApiClient

    public readonly authService: IAuthService
    public readonly instancesPropertiesService: IInstancesPropertiesService
    public readonly objectService: IObjectsService
    public readonly objectsInstancesService: IObjectsInstancesService
    public readonly objectsTypesService: IObjectsTypesService
    public readonly propertiesService: IPropertiesService
    public readonly propertiesTypesService: IPropertiesTypesService

    public constructor() {
        this.restApiClient = new AxiosClient(import.meta.env.VITE_API_BASE_URL, {}, `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`)

        this.authService = new AuthService(this.restApiClient)
        this.instancesPropertiesService = new InstancesPropertiesService(this.restApiClient)
        this.objectService = new ObjectsService(this.restApiClient)
        this.objectsInstancesService = new ObjectsInstancesService(this.restApiClient)
        this.objectsTypesService = new ObjectsTypesService(this.restApiClient)
        this.propertiesService = new PropertiesService(this.restApiClient)
        this.propertiesTypesService = new PropertiesTypesService(this.restApiClient)
    }
}