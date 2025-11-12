interface Toast {
    id: number
    header: string
    message: string
}

export interface IToastsStore {
    toasts: Toast[]
    addToast(header: string, message: string): void
    removeToast(id: number): void
}
