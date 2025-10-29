import { type AxiosInstance, type AxiosResponse, default as axios } from 'axios'

import type { LoginResponse } from '@/Schemas/Auth.ts'
import logError from '../log_error.ts'
import type RestApiClient from './RestApiClient.ts'
import { RestApiError } from './RestApiClient.ts'

export default class AxiosClient implements RestApiClient {
    private axiosInstance: AxiosInstance

    constructor(
        baseUrl: string,
        baseHeaders: Record<string, string>,
        refreshTokenUrl: string,
    ) {
        this.axiosInstance = axios.create({
            baseURL: baseUrl,
            withCredentials: true,
        })

        this.axiosInstance.interceptors.request.use(config => {
            config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
            return config
        })

        this.axiosInstance.interceptors.response.use(
            config => {
                return config
            },
            async error => {
                const originalRequest = error.config

                console.info(error.config._isRetry)

                if (
                    error.response.status === 401 &&
                    error.config &&
                    !error.config._isRetry
                ) {
                    console.info(
                        'received 401 from server, sending refresh request',
                    )

                    originalRequest._isRetry = true
                    try {
                        const refreshInstance = axios.create({
                            baseURL: baseUrl,
                            withCredentials: true,
                        })
                        const response =
                            await refreshInstance.post<LoginResponse>(
                                refreshTokenUrl,
                                {},
                            )
                        localStorage.setItem(
                            'token',
                            response.data.access_token,
                        )
                        originalRequest.headers['Authorization'] =
                            `Bearer ${response.data.access_token}`
                        return this.axiosInstance.request(originalRequest)
                    } catch (refreshError) {
                        if (error.response) {
                            const { status, data } = error.response
                            const message =
                                data?.detail || error.detail || 'Server error'
                            return Promise.reject(
                                new RestApiError(message, status, data, false),
                            )
                        } else {
                            logError(refreshError)
                            return Promise.reject(refreshError)
                        }
                    }
                }

                if (error.code === 'ERR_CANCELED') {
                    return new Promise(() => {})
                }

                console.warn(error)

                if (error.response) {
                    const { status, data } = error.response
                    const message =
                        data?.message || error.message || 'Server error'
                    return Promise.reject(
                        new RestApiError(message, status, data, false),
                    )
                } else {
                    return Promise.reject(
                        new RestApiError(
                            error.message || 'Network error',
                            undefined,
                            undefined,
                            true,
                        ),
                    )
                }
            },
        )

        for (const header in baseHeaders) {
            this.axiosInstance.defaults.headers.common[header] =
                baseHeaders[header]
        }
    }

    async get<ReturnData>(
        url: string,
        query?: Record<string, number | string>,
    ): Promise<ReturnData> {
        const response = await this.axiosInstance.get<ReturnData>(url, {
            params: query,
        })
        return response.data
    }

    async post<PostData, ReturnData>(
        url: string,
        data: PostData,
        query?: Record<string, number | string>,
    ): Promise<ReturnData> {
        console.info(
            `sending post to ${this.axiosInstance.getUri()}${url}, payload`,
            data,
        )

        const response = await this.axiosInstance.post<
            PostData,
            AxiosResponse<ReturnData>
        >(url, data, { params: query })
        return response.data
    }

    async patch<PatchData, ReturnData>(
        url: string,
        data: PatchData,
        query?: Record<string, number | string>,
    ): Promise<ReturnData> {
        console.info(
            `sending patch to ${this.axiosInstance.getUri()}${url}, payload`,
            data,
        )

        const response = await this.axiosInstance.patch<
            PatchData,
            AxiosResponse<ReturnData>
        >(url, data, { params: query })
        return response.data
    }

    async put<PutData, ReturnData>(
        url: string,
        data: PutData,
        query?: Record<string, number | string>,
    ): Promise<ReturnData> {
        console.info(
            `sending put to ${this.axiosInstance.getUri()}${url}, payload`,
            data,
        )

        const response = await this.axiosInstance.put<
            PutData,
            AxiosResponse<ReturnData>
        >(url, data, { params: query })
        return response.data
    }

    async delete<ReturnData>(
        url: string,
        query?: Record<string, number | string>,
    ): Promise<ReturnData> {
        console.info(
            `sending get to ${this.axiosInstance.getUri()}${url}, query`,
            query,
        )

        const response = await this.axiosInstance.delete<ReturnData>(url, {
            params: query,
        })
        return response.data
    }
}
