import {create} from "zustand/react";

import type {LoginRequest, User} from "../models/auth.ts";
import type IStore from "./IStore.ts";
import logError from "../log_error.ts";
import Services from "../services/Services.ts";

export const useStore = create<IStore>((set) => ({
    services: new Services(),
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
            const response = await this.services.authService.login(userData);
            localStorage.setItem("token", response.access_token);
            this.setAuth(true)
            this.setUser(await this.services.authService.me())
        } catch (e) {
            logError(e)
        }
    },

    async logout() {
        try {
            await this.services.authService.logout();
            localStorage.removeItem("token");
            this.setAuth(false)
            this.setUser({} as User)
        } catch (e: unknown) {
            logError(e)
        }
    },

    async checkAuth() {
        try {
            const response = await this.services.authService.refresh()
            localStorage.setItem("token", response.access_token);
            this.setAuth(true)
            this.setUser(await this.services.authService.me())
        } catch (e) {
            logError(e)
        }
    }
}));
