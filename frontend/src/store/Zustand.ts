import {create} from "zustand/react";

import type {LoginRequest, User} from "../models/auth.ts";
import AuthService from "../services/auth/AuthService.ts";
import type IStore from "./IStore.ts";


export const useStore = create<IStore>((set) => ({
    auth_service: new AuthService(),
    user: {} as User,
    isAuthenticated: false,

    setUser(user: User) {
        set({user: user})
    },

    setAuth(isAuthenticated: boolean) {
        set({isAuthenticated: isAuthenticated})
    },

    async login(userData: LoginRequest) {
        try {
            const response = await this.auth_service.login(userData);
            localStorage.setItem("token", response.access_token);
            this.setAuth(true)
            this.setUser(await this.auth_service.me())
        } catch (e) {
            console.log(e.response?.data?.detail)
        }
    },

    async logout() {
        try {
            await this.auth_service.logout();
            localStorage.removeItem("token");
            this.setAuth(false)
            this.setUser({} as User)
        } catch (e) {
            console.log(e.response?.data?.detail)
        }
    },

    async checkAuth() {
        try {
            const response = await this.auth_service.refresh()
            localStorage.setItem("token", response.access_token);
            this.setAuth(true)
            this.setUser(await this.auth_service.me())
        } catch (e) {
            console.log(e.response?.data?.detail)
        }
    }
}));
