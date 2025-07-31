export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
    level: number;
}

export interface RegisterResponse {
    user_id: number;
}

export interface User {
    id: number;
    username: string;
    level: number;
}
