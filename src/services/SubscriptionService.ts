import type { ApiClient } from './apiClient'
import type {
  CCBillSubscribePayload,
  FlexFormResponse,
  GenerateFlexFormURLBodyParams,
  NmiSubscribePayload,
  PaymentPlatform,
  SubscriptionResponse,
} from '../types/subscription'

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
