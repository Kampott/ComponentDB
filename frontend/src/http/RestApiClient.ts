export class RestApiError extends Error {
    public readonly detail?: string;

    constructor(
        status?: number,
        detail?: string,
    ) {
        super(`RestApiClient returns status ${status}: ${detail}`);
        this.detail = detail;
        this.name = 'ApiError';
    }
}

export default interface RestApiClient {
    get<ReturnData>(url: string, query?: Record<string, number | string>): Promise<ReturnData>

    post<PostData, ReturnData>(url: string, data: PostData, query?: Record<string, number | string>): Promise<ReturnData>

    patch<PatchData, ReturnData>(url: string, data: PatchData, query?: Record<string, number | string>): Promise<ReturnData>

    put<PutData, ReturnData>(url: string, data: PutData, query?: Record<string, number | string>): Promise<ReturnData>

    delete<ReturnData>(url: string, query?: Record<string, number | string>): Promise<ReturnData>
}