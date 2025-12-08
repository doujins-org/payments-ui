import type { ApiClient } from './apiClient'
import type {
  CheckoutRequestPayload,
  CheckoutResponse,
  FlexFormResponse,
  GenerateFlexFormURLBodyParams,
} from '../types/subscription'
import type { PaginatedPayments } from '../types'

export class SubscriptionService {
  constructor(private readonly api: ApiClient) {}

  async checkout(payload: CheckoutRequestPayload): Promise<CheckoutResponse> {
    return this.api.post('/me/checkout', {
      body: { ...payload } as Record<string, unknown>,
    })
  }

  async generateFlexFormUrl(
    payload: GenerateFlexFormURLBodyParams
  ): Promise<FlexFormResponse> {
    return this.api.post(`/subscriptions/ccbill/flexform-url`, {
      body: { ...payload } as Record<string, unknown>,
    })
  }

  async getPaymentHistory(
    params?: { limit?: number; offset?: number; type?: string }
  ): Promise<PaginatedPayments> {
    const limit = params?.limit ?? 10
    const offset = params?.offset ?? 0
    const query: Record<string, string> = {
      limit: String(limit),
      offset: String(offset),
    }

    if (params?.type) {
      query.type = params.type
    }

    const response = await this.api.get<PaginatedPayments>('/me/payments', {
      query,
    })

    const totalItems = response?.total_items ?? 0
    const pageSize = limit
    const pageNumber =
      response?.page ?? (pageSize > 0 ? Math.floor(offset / pageSize) + 1 : 1)
    const totalPages =
      response?.total_pages ??
      (pageSize > 0 ? Math.ceil(totalItems / pageSize) : undefined)

    return {
      data: response?.data ?? [],
      total_items: totalItems,
      limit,
      offset,
      page: pageNumber,
      page_size: pageSize,
      total_pages: totalPages,
    }
  }

  async cancelSubscription(feedback?: string): Promise<{ message: string; success: boolean }> {
    return this.api.post('/me/subscriptions/cancel', {
      body: feedback ? { feedback } : undefined,
    })
  }
}
