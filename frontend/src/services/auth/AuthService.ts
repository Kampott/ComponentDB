import type RestApiClient from "../../http/RestApiClient.ts";
import type {LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, User} from "../../models/auth.ts";
import type IAuthService from "./IAuthService.ts";


export default class AuthService implements IAuthService {
    private client: RestApiClient;

    public constructor(client: RestApiClient) {
        this.client = client
    }

    async login(userData: LoginRequest): Promise<LoginResponse> {
        return await this.client.post<LoginRequest, LoginResponse>("/login", userData);
    }

    async register(userData: RegisterRequest): Promise<RegisterResponse> {
        return await this.client.post<RegisterRequest, RegisterResponse>("/register", userData);
    }

    async logout(): Promise<void> {
        return await this.client.delete("/logout");
    }


    async refresh(): Promise<LoginResponse> {
        return await this.client.post<null, LoginResponse>("/refresh", null)
    }

    async me(): Promise<User> {
        return await this.client.get<User>("/me");
    }
}
