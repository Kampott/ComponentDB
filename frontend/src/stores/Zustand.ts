import {create} from "zustand/react";

import type {LoginRequest, User} from "../schemas/Auth.ts";
import type IServicesStore from "./IServicesStore.ts";
import logError from "../log_error.ts";
import Services from "../services/Services.ts";
import type IUserStore from "./IUserStore.ts";
import type IToastsStore from "./IToastsStore.ts";

export const useServicesStore = create<IServicesStore>(() => ({
    services: new Services(),
}));

export const useUserStore = create<IUserStore>((set) => ({
    user: {} as User,
    isAuthenticated: false,

    setUser(user: User) {
        set({user: user})
    },

    setAuth(isAuthenticated: boolean) {
        set({isAuthenticated: isAuthenticated})
    },

    async login(userData: LoginRequest) {
        const response = await useServicesStore.getState().services.authService.login(userData);
        localStorage.setItem("token", response.access_token);
        this.setAuth(true)
        this.setUser(await useServicesStore.getState().services.authService.me())
    },

    async logout() {
        try {
            await useServicesStore.getState().services.authService.logout();
            localStorage.removeItem("token");
            this.setAuth(false)
            this.setUser({} as User)
        } catch (e: unknown) {
            logError(e)
        }
    },

    async checkAuth() {
        try {
            const response = await useServicesStore.getState().services.authService.refresh()
            localStorage.setItem("token", response.access_token);
            this.setAuth(true)
            this.setUser(await useServicesStore.getState().services.authService.me())
        } catch (e) {
            logError(e)
        }
    }
}));


export const useToastStore = create<IToastsStore>((set) => ({
    toasts: [],

    addToast(header: string, message: string) {
        set((state) => ({
            toasts: [...state.toasts, {id: Date.now(), header: header, message: message}],
        }))
    },

    removeToast(id: number): void {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }))
    }
}));
