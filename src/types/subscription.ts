import type { BillingDetails } from './billing'

export type PaymentPlatform = 'nmi' | 'ccbill'

export type CheckoutStatus = 'success' | 'pending' | 'redirect_required' | 'blocked'

export interface CheckoutResponse {
  status: CheckoutStatus
  message?: string
  subscription_id?: string
  payment_id?: string
  transaction_id?: string
  redirect_url?: string
  delayed_start?: string
}

export interface FlexFormResponse {
  redirect_url: string
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

export interface CheckoutRequestPayload {
  price_id: string
  processor: string
  payment_token?: string
  payment_method_id?: string
  provider?: string
  email?: string
  first_name?: string
  last_name?: string
  address1?: string
  city?: string
  state?: string
  zip?: string
  country?: string
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
