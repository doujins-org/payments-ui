import type { BillingDetails, CreatePaymentMethodPayload, PaymentConfig } from '../types'
import { loadCollectJs } from '../utils/collect'

export interface CardTokenizeResult {
  token: string
  billing: BillingDetails
}

export class CardPaymentService {
  private collectLoaded = false

  constructor(private config: PaymentConfig) {}

  async ensureCollectLoaded(): Promise<void> {
    if (this.collectLoaded) return
    if (!this.config.collectJsKey) {
      throw new Error('payments-ui: collect.js key missing')
    }

    loadCollectJs(this.config.collectJsKey)
    this.collectLoaded = true
  }

  buildCreatePayload(result: CardTokenizeResult): CreatePaymentMethodPayload {
    return {
      payment_token: result.token,
      first_name: result.billing.firstName,
      last_name: result.billing.lastName,
      address1: result.billing.address1,
      address2: result.billing.address2,
      city: result.billing.city,
      state: result.billing.stateRegion,
      zip: result.billing.postalCode,
      country: result.billing.country,
      email: result.billing.email,
      provider: result.billing.provider,
    }
  }
}
