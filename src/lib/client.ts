/**
 * Minimal Billing API client used by the payments UI.
 *
 * Usage:
 * ```ts
 * const client = createClient({
 *   billingBaseUrl: 'https://billing.example.com',
 *   getAuthToken: () => authStore.token,
 * })
 *
 * const methods = await client.listPaymentMethods({ limit: 10 })
 * const checkout = await client.checkout({ price_id: 'price_123', processor: 'mobius' })
 * ```
 */
import type {
  CheckoutRequestPayload,
  CheckoutResponse,
} from '../types/subscription'
import type {
  CreatePaymentMethodPayload,
  Payment,
  PaymentMethod,
} from '../types/billing'
import type {
  TokenInfo,
  PaymentStatusResponse,
  SolanaPayQRCodeIntent,
  SolanaPayStatusResponse,
} from '../types/solana-pay'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ClientConfig {
  billingBaseUrl: string
  billingBasePath?: string
  accountBaseUrl?: string
  accountBasePath?: string
  getAuthToken?: () => string | null | Promise<string | null>
  defaultHeaders?: Record<string, string>
  fetch?: typeof fetch
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
  target?: 'billing' | 'account'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export class ClientApiError extends Error {
  status: number
  body: unknown
  request: { method: HttpMethod; url: string }

  constructor(
    message: string,
    status: number,
    body: unknown,
    request: { method: HttpMethod; url: string }
  ) {
    super(message)
    this.name = 'ClientApiError'
    this.status = status
    this.body = body
    this.request = request
  }
}

interface ListResponse<T> {
  object?: string
  data?: T[]
  total?: number
  total_items?: number
  limit?: number
  offset?: number
  has_more?: boolean
}

const ensureFetch = (fetchImpl?: typeof fetch): typeof fetch => {
  if (fetchImpl) return fetchImpl
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis)
  }
  throw new Error('payments-ui: global fetch is not available')
}

export const createClient = (config: ClientConfig) => {
  const fetchImpl = ensureFetch(config.fetch)
  const normalizeBase = (value: string) => value.replace(/\/$/, '')
  const normalizePath = (value?: string, fallback = '/v1') => {
    if (!value) return fallback
    return value.startsWith('/') ? value : `/${value}`
  }

  const billingBaseUrl = normalizeBase(config.billingBaseUrl)
  const accountBaseUrl = normalizeBase(
    config.accountBaseUrl ?? config.billingBaseUrl
  )
  const billingBasePath = normalizePath(config.billingBasePath ?? '/v1')
  const accountBasePath = normalizePath(
    config.accountBasePath ?? config.billingBasePath ?? '/v1'
  )
  const defaultHeaders = config.defaultHeaders ?? {}

  const resolveAuthToken = async (): Promise<string | null> => {
    if (!config.getAuthToken) return null
    try {
      const result = config.getAuthToken()
      return result instanceof Promise ? await result : result
    } catch (error) {
      console.warn('payments-ui: failed to resolve auth token', error)
      return null
    }
  }

  const buildUrl = (
    path: string,
    query: Record<string, string | number | boolean | undefined> | undefined,
    target: 'billing' | 'account'
  ): string => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const basePath = target === 'account' ? accountBasePath : billingBasePath
    const baseUrl = target === 'account' ? accountBaseUrl : billingBaseUrl
    const needsBasePrefix = !normalizedPath.startsWith(basePath)
    const finalPath = needsBasePrefix ? `${basePath}${normalizedPath}` : normalizedPath
    const url = new URL(`${baseUrl}${finalPath}`)
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return
        url.searchParams.append(key, String(value))
      })
    }
    return url.toString()
  }

  const request = async <T>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions
  ): Promise<T> => {
    const target = options?.target ?? 'billing'
    const url = buildUrl(path, options?.query, target)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...(options?.headers ?? {}),
    }

    const token = await resolveAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetchImpl(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = await response.text()
      }
      throw new ClientApiError(
        payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message?: string }).message)
          : response.statusText || 'Request failed',
        response.status,
        payload,
        { method, url }
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  const normalizeList = <T>(payload: ListResponse<T>): PaginatedResponse<T> => {
    const data = payload.data ?? []
    const total = payload.total ?? payload.total_items ?? data.length
    const limit = payload.limit ?? data.length
    const offset = payload.offset ?? 0
    const hasMore =
      typeof payload.has_more === 'boolean'
        ? payload.has_more
        : offset + data.length < total
    return { data, total, limit, offset, hasMore }
  }

  return {
    async listPaymentMethods(params?: {
      limit?: number
      offset?: number
      includeInactive?: boolean
    }): Promise<PaginatedResponse<PaymentMethod>> {
      const result = await request<ListResponse<PaymentMethod>>(
        'GET',
        '/me/payment-methods',
        {
          query: {
            limit: params?.limit,
            offset: params?.offset,
            include_inactive: params?.includeInactive,
          },
          target: 'account',
        }
      )
      return normalizeList(result)
    },

    createPaymentMethod(payload: CreatePaymentMethodPayload): Promise<PaymentMethod> {
      return request('POST', '/me/payment-methods', {
        body: payload,
        target: 'account',
      })
    },

    updatePaymentMethod(
      id: string,
      payload: CreatePaymentMethodPayload
    ): Promise<PaymentMethod> {
      return request('PUT', `/me/payment-methods/${id}`, {
        body: payload,
        target: 'account',
      })
    },

    deletePaymentMethod(id: string): Promise<void> {
      return request<void>('DELETE', `/me/payment-methods/${id}`, {
        target: 'account',
      })
    },

    activatePaymentMethod(id: string): Promise<void> {
      return request<void>('PUT', `/me/payment-methods/${id}/activate`, {
        target: 'account',
      })
    },

    checkout(payload: CheckoutRequestPayload): Promise<CheckoutResponse> {
      return request('POST', '/me/checkout', {
        body: payload,
      })
    },

    cancelSubscription(feedback?: string): Promise<{ message: string; success: boolean }> {
      return request('POST', '/me/subscriptions/cancel', {
        body: feedback ? { feedback } : undefined,
      })
    },

    async getPaymentHistory(params?: {
      limit?: number
      offset?: number
      type?: string
    }): Promise<PaginatedResponse<Payment>> {
      const result = await request<ListResponse<Payment>>('GET', '/me/payments', {
        query: {
          limit: params?.limit,
          offset: params?.offset,
          type: params?.type,
        },
      })
      return normalizeList(result)
    },

    async getSolanaTokens(): Promise<TokenInfo[]> {
      const response = await request<{ tokens?: TokenInfo[] } | TokenInfo[]>(
        'GET',
        '/solana/tokens'
      )
      if (Array.isArray(response)) {
        return response
      }
      return response.tokens ?? []
    },

    async createSolanaPayIntent(payload: {
      priceId: string
      token: string
      userWallet?: string
    }): Promise<SolanaPayQRCodeIntent> {
      const response = await request<any>('POST', '/solana/pay', {
        body: {
          price_id: payload.priceId,
          token: payload.token,
          ...(payload.userWallet ? { user_wallet: payload.userWallet } : {}),
        },
      })

      return response as SolanaPayQRCodeIntent
    },

    async getSolanaPayStatus(reference: string): Promise<SolanaPayStatusResponse> {
      const response = await request<{
        status: string
        payment_id?: string
        signature?: string
        intent_id?: string
      }>(
        'GET',
        `/solana/pay/${reference}`
      )

      if (response.status === 'confirmed') {
        return {
          status: 'confirmed',
          payment_id: response.payment_id ?? '',
          transaction: response.signature ?? null,
          intent_id: response.intent_id,
        }
      }

      if (response.status === 'expired') {
        return {
          status: 'failed',
          payment_id: response.payment_id ?? '',
          transaction: response.signature ?? null,
          intent_id: response.intent_id,
          error_message: 'Payment intent expired',
        }
      }

      return {
        status: 'pending',
        payment_id: response.payment_id ?? '',
        transaction: response.signature ?? null,
        intent_id: response.intent_id,
      }
    },

    async getPaymentStatus(id: string): Promise<PaymentStatusResponse | null> {
      try {
        return await request<PaymentStatusResponse>('GET', `/payment/status/${id}`)
      } catch (error) {
        if (error instanceof ClientApiError && error.status === 404) {
          return null
        }
        throw error
      }
    },
  }
}

export type Client = ReturnType<typeof createClient>
