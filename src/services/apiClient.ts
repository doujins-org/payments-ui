import type {
  PaymentFetcher,
  PaymentConfig,
} from '../types/config'

export type RequestOptions = {
  params?: Record<string, string | number>
  query?: Record<string, string | number | undefined>
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiClient {
  request: <T>(method: HttpMethod, path: string, options?: RequestOptions) => Promise<T>
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  post: <T>(path: string, options?: RequestOptions) => Promise<T>
  put: <T>(path: string, options?: RequestOptions) => Promise<T>
  patch: <T>(path: string, options?: RequestOptions) => Promise<T>
  delete: <T>(path: string, options?: RequestOptions) => Promise<T>
}

const buildUrl = (
  baseUrl: string,
  path: string,
  { params, query }: Pick<RequestOptions, 'params' | 'query'>
): string => {
  let resolved = `${baseUrl}${path}`
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      resolved = resolved.replace(`:${key}`, encodeURIComponent(String(value)))
    })
  }
  if (query) {
    const queryString = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      queryString.append(key, String(value))
    })
    if ([...queryString.keys()].length > 0) {
      resolved = `${resolved}?${queryString.toString()}`
    }
  }
  return resolved
}

export const createApiClient = (
  paymentConfig: PaymentConfig,
  baseUrl: string,
  fetcher: PaymentFetcher,
  resolveAuthToken: () => Promise<string | null>
): ApiClient => {
  const request = async <T>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions
  ): Promise<T> => {
    const url = buildUrl(baseUrl, path, options ?? {})
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(paymentConfig.defaultHeaders ?? {}),
      ...(options?.headers ?? {}),
    }

    const token = await resolveAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetcher(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      })

      if (!response.ok) {
        const message = await response.text()
        console.error('payments-ui: API request failed', {
          url,
          method,
          status: response.status,
          message,
        })
        throw new Error(message || `Request failed with status ${response.status}`)
      }

      if (response.status === 204) {
        return undefined as T
      }

      const data = (await response.json()) as T
      return data
    } catch (error) {
      console.error('payments-ui: API request error', { url, method, error })
      throw error
    }
  }

  return {
    request,
    get: (path, options) => request('GET', path, options),
    post: (path, options) => request('POST', path, options),
    put: (path, options) => request('PUT', path, options),
    patch: (path, options) => request('PATCH', path, options),
    delete: (path, options) => request('DELETE', path, options),
  }
}
