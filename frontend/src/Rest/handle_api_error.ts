import { RestApiError } from '@Rest/RestApiClient.ts'
import type { NavigateFunction } from 'react-router-dom'

type Handlers = {
    navigate?: NavigateFunction
    setFormErrors?: (errors: Record<string, string[] | string>) => void
    showToast?: (msg: string) => void
    setGlobalError?: (msg: string | null) => void
}

export function handleApiError(err: unknown, handlers: Handlers = {}) {
    if (!(err instanceof RestApiError)) {
        handlers.showToast?.('Неизвестная ошибка')
        handlers.setGlobalError?.('Неизвестная ошибка')
        return
    }

    console.log(err.status)

    switch (err.status) {
        case 404:
            handlers.navigate?.('/404')
            break

        case 422: {
            const payload = err.payload
            // ожидаем payload.errors: { field: ["msg1", "msg2"] }
            if (payload?.detail && handlers.setFormErrors) {
                const errors = payload.detail as Record<
                    string,
                    string[] | string
                >
                handlers.setFormErrors(errors)
            } else {
                handlers.showToast?.(payload?.message || 'Ошибка в запросе')
            }
            break
        }

        case 500:
            handlers.showToast?.('Внутренняя ошибка сервера — попробуйте позже')
            handlers.setGlobalError?.('Ошибка сервера')
            break

        case 401:
            console.info('Received 401 on api error, navigating to /login')
            handlers.navigate?.('/login')
            break

        default:
            if (err.isNetworkError) {
                handlers.showToast?.('Нет соединения с сервером')
                handlers.setGlobalError?.('Нет соединения')
            } else {
                handlers.showToast?.(err.message || 'Произошла ошибка')
            }
    }
}
