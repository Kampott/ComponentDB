export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    access_token: string
    refresh_token: string
}

export interface RegisterRequest {
    email: string
    password: string
    level: number
}

export interface RegisterResponse {
    user_id: number
}

export interface User {
    id: number
    email: string
    level: number
}
