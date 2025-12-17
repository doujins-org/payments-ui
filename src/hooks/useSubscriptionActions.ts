import { useCallback } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import type {
  BillingDetails,
  CheckoutRequestPayload,
  CheckoutResponse,
} from '../types'

export interface SubscribeWithCardParams {
  priceId?: string | null
  processor?: string
  provider?: string
  paymentToken: string
  billing: BillingDetails
  idempotencyKey?: string
}

export interface SubscribeWithSavedMethodParams {
  priceId?: string | null
  processor?: string
  provider?: string
  paymentMethodId: string
  email?: string
  idempotencyKey?: string
}

export interface SubscribeWithCCBillParams {
  priceId?: string | null
  email: string
  firstName: string
  lastName: string
  zipCode: string
  country: string
  processor?: string
  idempotencyKey?: string
}

export const useSubscriptionActions = () => {
  const { client } = usePaymentContext()

  const ensurePrice = (priceId?: string | null) => {
    if (!priceId) {
      throw new Error('payments-ui: priceId is required for subscription actions')
    }
    return priceId
  }

  const subscribeWithCard = useCallback(
    async ({
      priceId,
      processor = 'nmi',
      provider,
      paymentToken,
      billing,
      idempotencyKey,
    }: SubscribeWithCardParams): Promise<CheckoutResponse> => {
      const payload: CheckoutRequestPayload = {
        price_id: ensurePrice(priceId),
        processor,
        provider,
        payment_token: paymentToken,
        email: billing.email,
        first_name: billing.firstName,
        last_name: billing.lastName,
        address1: billing.address1,
        city: billing.city,
        state: billing.stateRegion,
        zip: billing.postalCode,
        country: billing.country,
      }
      return client.checkout(payload, idempotencyKey)
    },
    [client]
  )

  const subscribeWithSavedMethod = useCallback(
    async ({
      priceId,
      processor = 'nmi',
      provider,
      paymentMethodId,
      email,
      idempotencyKey,
    }: SubscribeWithSavedMethodParams): Promise<CheckoutResponse> => {
      const payload: CheckoutRequestPayload = {
        price_id: ensurePrice(priceId),
        processor,
        provider,
        payment_method_id: paymentMethodId,
        email,
      }
      return client.checkout(payload, idempotencyKey)
    },
    [client]
  )

  const subscribeWithCCBill = useCallback(
    async ({
      priceId,
      email,
      firstName,
      lastName,
      zipCode,
      country,
      processor = 'ccbill',
      idempotencyKey,
    }: SubscribeWithCCBillParams): Promise<CheckoutResponse> => {
      const payload: CheckoutRequestPayload = {
        price_id: ensurePrice(priceId),
        processor,
        email,
        first_name: firstName,
        last_name: lastName,
        zip: zipCode,
        country,
      }
      return client.checkout(payload, idempotencyKey)
    },
    [client]
  )

  return {
    subscribeWithCard,
    subscribeWithSavedMethod,
    subscribeWithCCBill,
  }
}
