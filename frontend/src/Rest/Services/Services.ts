import type IAdminUsersService from '@/Interfaces/Services/IAdminUsersService.ts'
import type IAuthService from '@/Interfaces/Services/IAuthService.ts'
import type IEventTypeRelationsService from '@/Interfaces/Services/IEventTypeRelationsService.ts'
import type IEventsService from '@/Interfaces/Services/IEventsService.ts'
import type IEventsTypesService from '@/Interfaces/Services/IEventsTypesService.ts'
import type IInstancesPropertiesService from '@/Interfaces/Services/IInstancesPropertiesService.ts'
import type IObjectsInstancesService from '@/Interfaces/Services/IObjectsInstancesService.ts'
import type IObjectsService from '@/Interfaces/Services/IObjectsService.ts'
import type IObjectsTypesService from '@/Interfaces/Services/IObjectsTypesService.ts'
import type IPermissionsService from '@/Interfaces/Services/IPermissionsService.ts'
import type IPropertiesService from '@/Interfaces/Services/IPropertiesService.ts'
import type IPropertiesTypesService from '@/Interfaces/Services/IPropertiesTypesService.ts'
import type IReplacementEventsService from '@/Interfaces/Services/IReplacementEventsService.ts'
import type IRolesService from '@/Interfaces/Services/IRolesService.ts'
import MockAdminUsersService from '@/Mocks/Services/MockAdminUsersService.ts'
import MockAuthService from '@/Mocks/Services/MockAuthService.ts'
import MockDataStore from '@/Mocks/Services/MockDataStore.ts'
import MockEventTypeRelationsService from '@/Mocks/Services/MockEventTypeRelationsService.ts'
import MockEventsService from '@/Mocks/Services/MockEventsService.ts'
import MockEventsTypesService from '@/Mocks/Services/MockEventsTypesService.ts'
import MockInstancesPropertiesService from '@/Mocks/Services/MockInstancesPropertiesService.ts'
import MockObjectsInstancesService from '@/Mocks/Services/MockObjectsInstancesService.ts'
import MockObjectsService from '@/Mocks/Services/MockObjectsService.ts'
import MockObjectsTypesService from '@/Mocks/Services/MockObjectsTypesService.ts'
import MockPermissionsService from '@/Mocks/Services/MockPermissionsService.ts'
import MockPropertiesService from '@/Mocks/Services/MockPropertiesService.ts'
import MockPropertiesTypesService from '@/Mocks/Services/MockPropertiesTypesService.ts'
import MockReplacementEventsService from '@/Mocks/Services/MockReplacementEventsService.ts'
import MockRolesService from '@/Mocks/Services/MockRolesService.ts'
import AxiosClient from '@Rest/AxiosClient.ts'
import type RestApiClient from '@Rest/RestApiClient.ts'
import AdminUsersService from './AdminUsersService.ts'
import AuthService from './AuthService.ts'
import EventTypeRelationsService from './EventTypeRelationsService.ts'
import EventsService from './EventsService.ts'
import EventsTypesService from './EventsTypesService.ts'
import InstancesPropertiesService from './InstancesPropertiesService.ts'
import ObjectsInstancesService from './ObjectsInstancesService.ts'
import ObjectsService from './ObjectsService.ts'
import ObjectsTypesService from './ObjectsTypesService.ts'
import PermissionsService from './PermissionsService.ts'
import PropertiesService from './PropertiesService.ts'
import PropertiesTypesService from './PropertiesTypesService.ts'
import ReplacementEventsService from './ReplacementEventsService.ts'
import RolesService from './RolesService.ts'

export default class Services {
    public readonly provider: 'mock' | 'rest'
    public readonly features: {
        adminUsersCrud: boolean
    }
    public readonly restApiClient: RestApiClient | null

    public readonly adminUsersService: IAdminUsersService
    public readonly authService: IAuthService
    public readonly eventsService: IEventsService
    public readonly eventTypeRelationsService: IEventTypeRelationsService
    public readonly eventsTypesService: IEventsTypesService
    public readonly instancesPropertiesService: IInstancesPropertiesService
    public readonly objectService: IObjectsService
    public readonly permissionsService: IPermissionsService
    public readonly objectsInstancesService: IObjectsInstancesService
    public readonly objectsTypesService: IObjectsTypesService
    public readonly propertiesService: IPropertiesService
    public readonly propertiesTypesService: IPropertiesTypesService
    public readonly replacementEventsService: IReplacementEventsService
    public readonly rolesService: IRolesService

    public constructor() {
        const provider = String(
            import.meta.env.VITE_SERVICES_PROVIDER ?? 'rest',
        ).toLowerCase()

        if (provider === 'mock') {
            this.provider = 'mock'
            this.features = {
                adminUsersCrud: true,
            }
            const store = new MockDataStore()

            this.restApiClient = null
            this.adminUsersService = new MockAdminUsersService(store)
            this.authService = new MockAuthService(store)
            this.eventsService = new MockEventsService(store)
            this.eventTypeRelationsService = new MockEventTypeRelationsService(
                store,
            )
            this.eventsTypesService = new MockEventsTypesService(store)
            this.instancesPropertiesService =
                new MockInstancesPropertiesService(store)
            this.objectService = new MockObjectsService(store)
            this.permissionsService = new MockPermissionsService(store)
            this.objectsInstancesService = new MockObjectsInstancesService(
                store,
            )
            this.objectsTypesService = new MockObjectsTypesService(store)
            this.propertiesService = new MockPropertiesService(store)
            this.propertiesTypesService = new MockPropertiesTypesService(store)
            this.replacementEventsService = new MockReplacementEventsService(
                store,
            )
            this.rolesService = new MockRolesService(store)
            return
        }

        this.provider = 'rest'
        this.features = {
            adminUsersCrud: false,
        }
        this.restApiClient = new AxiosClient(
            import.meta.env.VITE_API_BASE_URL,
            {},
            `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        )

        this.adminUsersService = new AdminUsersService(this.restApiClient)
        this.authService = new AuthService(this.restApiClient)
        this.eventsService = new EventsService(this.restApiClient)
        this.eventTypeRelationsService = new EventTypeRelationsService(
            this.restApiClient,
        )
        this.eventsTypesService = new EventsTypesService(this.restApiClient)
        this.instancesPropertiesService = new InstancesPropertiesService(
            this.restApiClient,
        )
        this.objectService = new ObjectsService(this.restApiClient)
        this.permissionsService = new PermissionsService(this.restApiClient)
        this.objectsInstancesService = new ObjectsInstancesService(
            this.restApiClient,
        )
        this.objectsTypesService = new ObjectsTypesService(this.restApiClient)
        this.propertiesService = new PropertiesService(this.restApiClient)
        this.propertiesTypesService = new PropertiesTypesService(
            this.restApiClient,
        )
        this.replacementEventsService = new ReplacementEventsService(
            this.restApiClient,
        )
        this.rolesService = new RolesService(this.restApiClient)
    }
}
