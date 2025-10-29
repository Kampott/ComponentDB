import { AxiosError } from 'axios'

export default function logError(e: unknown): void {
    if (e instanceof AxiosError) {
        console.error(e.response?.data?.detail)
    } else if (e instanceof Error) {
        console.error(e)
    }
}
