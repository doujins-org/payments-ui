import type { BillingDetails } from './billing'

export type PaymentPlatform = 'nmi' | 'ccbill'

export interface SubscriptionResponse {
  success: boolean
  message?: string
  subscription_id?: string
  status?: 'active' | 'inactive' | 'cancelled'
  url?: string
}

export interface FlexFormResponse {
  iframe_url: string
  width: string
  height: string
  success_url: string
  decline_url: string
}

export interface GenerateFlexFormURLBodyParams {
  price_id: string
  first_name: string
  last_name: string
  address1: string
  city: string
  state: string
  zip_code: string
  country: string
}

export interface NmiSubscribePayload {
  priceId: string
  paymentToken?: string
  paymentMethodId?: string
  firstName?: string
  lastName?: string
  address1?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  email?: string
  provider?: string
  processor?: string
}

export interface CCBillSubscribePayload {
  priceId: string
  email: string
  firstName: string
  lastName: string
  zipCode: string
  country: string
  processor?: string
}

export interface SubscriptionCheckoutPayload {
  priceId: string
  provider?: string
  processor?: string
  billing: BillingDetails
}
