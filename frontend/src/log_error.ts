import {AxiosError} from "axios";

export default function logError(e: unknown): void {
    if (e instanceof AxiosError) {
        console.log(e.response?.data?.detail)
    } else if (e instanceof Error) {
        console.log(e)
    }
}