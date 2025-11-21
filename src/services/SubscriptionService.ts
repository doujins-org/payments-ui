import type { ApiClient } from './apiClient'
import type {
  CCBillSubscribePayload,
  FlexFormResponse,
  GenerateFlexFormURLBodyParams,
  NmiSubscribePayload,
  PaymentPlatform,
  SubscriptionResponse,
} from '../types/subscription'
import type { PaginatedPayments } from '../types'

export class SubscriptionService {
  constructor(private readonly api: ApiClient) {}

  async subscribe(
    platform: PaymentPlatform,
    payload: NmiSubscribePayload | CCBillSubscribePayload
  ): Promise<SubscriptionResponse> {
    const body = this.serializePayload(platform, payload)
    return this.api.post<SubscriptionResponse>(
      `/subscriptions/process/${platform}`,
      {
        body,
      }
    )
  }

  async generateFlexFormUrl(
    payload: GenerateFlexFormURLBodyParams
  ): Promise<FlexFormResponse> {
    return this.api.post('/subscriptions/flexform', {
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

    const response = await this.api.get<PaginatedPayments>('/subscriptions/purchases', {
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
    return this.api.post('/subscriptions/cancel', {
      body: feedback ? { feedback } : undefined,
    })
  }

  private serializePayload(
    platform: PaymentPlatform,
    payload: NmiSubscribePayload | CCBillSubscribePayload
  ): Record<string, unknown> {
    if (platform === 'nmi') {
      const data = payload as NmiSubscribePayload
      if (!data.priceId) {
        throw new Error('payments-ui: priceId is required for NMI subscriptions')
      }

      if (!data.paymentToken && !data.paymentMethodId) {
        throw new Error(
          'payments-ui: paymentToken or paymentMethodId is required for NMI subscriptions'
        )
      }

      const body: Record<string, unknown> = {
        price_id: data.priceId,
        processor: data.processor ?? 'nmi',
        provider: data.provider,
      }

      if (data.email) body.email = data.email
      if (data.firstName) body.first_name = data.firstName
      if (data.lastName) body.last_name = data.lastName
      if (data.address1) body.address1 = data.address1
      if (data.city) body.city = data.city
      if (data.state) body.state = data.state
      if (data.zipCode) body.zip = data.zipCode
      if (data.country) body.country = data.country
      if (data.paymentToken) body.payment_token = data.paymentToken
      if (data.paymentMethodId) body.payment_method_id = data.paymentMethodId

      return body
    }

    const data = payload as CCBillSubscribePayload
    if (!data.priceId) {
      throw new Error('payments-ui: priceId is required for CCBill subscriptions')
    }

    return {
      price_id: data.priceId,
      processor: data.processor ?? 'ccbill',
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      zip: data.zipCode,
      country: data.country,
    }
  }
}
