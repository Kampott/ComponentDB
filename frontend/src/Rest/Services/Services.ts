import type IAuthService from '@/Interfaces/Services/IAuthService.ts'
import type IInstancesPropertiesService from '@/Interfaces/Services/IInstancesPropertiesService.ts'
import type IObjectsInstancesService from '@/Interfaces/Services/IObjectsInstancesService.ts'
import type IObjectsService from '@/Interfaces/Services/IObjectsService.ts'
import type IObjectsTypesService from '@/Interfaces/Services/IObjectsTypesService.ts'
import type IPropertiesService from '@/Interfaces/Services/IPropertiesService.ts'
import type IPropertiesTypesService from '@/Interfaces/Services/IPropertiesTypesService.ts'
import AxiosClient from '@Rest/AxiosClient.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import AuthService from './AuthService.ts'
import InstancesPropertiesService from './InstancesPropertiesService.ts'
import MockAuthService from './MockAuthService.ts'
import MockDataStore from './MockDataStore.ts'
import MockInstancesPropertiesService from './MockInstancesPropertiesService.ts'
import MockObjectsInstancesService from './MockObjectsInstancesService.ts'
import MockObjectsService from './MockObjectsService.ts'
import MockObjectsTypesService from './MockObjectsTypesService.ts'
import MockPropertiesService from './MockPropertiesService.ts'
import MockPropertiesTypesService from './MockPropertiesTypesService.ts'
import ObjectsInstancesService from './ObjectsInstancesService.ts'
import ObjectsService from './ObjectsService.ts'
import ObjectsTypesService from './ObjectsTypesService.ts'
import PropertiesService from './PropertiesService.ts'
import PropertiesTypesService from './PropertiesTypesService.ts'

export default class Services {
    public readonly restApiClient: RestApiClient | null

    public readonly authService: IAuthService
    public readonly instancesPropertiesService: IInstancesPropertiesService
    public readonly objectService: IObjectsService
    public readonly objectsInstancesService: IObjectsInstancesService
    public readonly objectsTypesService: IObjectsTypesService
    public readonly propertiesService: IPropertiesService
    public readonly propertiesTypesService: IPropertiesTypesService

    public constructor() {
        const provider = String(
            import.meta.env.VITE_SERVICES_PROVIDER ?? 'rest',
        ).toLowerCase()

        if (provider === 'mock') {
            const store = new MockDataStore()

            this.restApiClient = null
            this.authService = new MockAuthService(store)
            this.instancesPropertiesService =
                new MockInstancesPropertiesService(store)
            this.objectService = new MockObjectsService(store)
            this.objectsInstancesService = new MockObjectsInstancesService(
                store,
            )
            this.objectsTypesService = new MockObjectsTypesService(store)
            this.propertiesService = new MockPropertiesService(store)
            this.propertiesTypesService = new MockPropertiesTypesService(store)
            return
        }

        this.restApiClient = new AxiosClient(
            import.meta.env.VITE_API_BASE_URL,
            {},
            `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        )

        this.authService = new AuthService(this.restApiClient)
        this.instancesPropertiesService = new InstancesPropertiesService(
            this.restApiClient,
        )
        this.objectService = new ObjectsService(this.restApiClient)
        this.objectsInstancesService = new ObjectsInstancesService(
            this.restApiClient,
        )
        this.objectsTypesService = new ObjectsTypesService(this.restApiClient)
        this.propertiesService = new PropertiesService(this.restApiClient)
        this.propertiesTypesService = new PropertiesTypesService(
            this.restApiClient,
        )
    }
}
