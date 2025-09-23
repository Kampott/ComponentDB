export interface ApiErrorPayload {
    message?: string;
    detail?: Record<string, string[] | string>;
}

export class RestApiError extends Error {
    public status?: number;
    public payload?: ApiErrorPayload;
    public isNetworkError: boolean;

    constructor(message: string, status?: number, payload?: ApiErrorPayload, isNetworkError = false) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
        this.isNetworkError = isNetworkError;
    }
}

export default interface RestApiClient {
    get<ReturnData>(url: string, query?: Record<string, number | string>): Promise<ReturnData>

    post<PostData, ReturnData>(url: string, data: PostData, query?: Record<string, number | string>): Promise<ReturnData>

    patch<PatchData, ReturnData>(url: string, data: PatchData, query?: Record<string, number | string>): Promise<ReturnData>

    put<PutData, ReturnData>(url: string, data: PutData, query?: Record<string, number | string>): Promise<ReturnData>

    delete<ReturnData>(url: string, query?: Record<string, number | string>): Promise<ReturnData>
}