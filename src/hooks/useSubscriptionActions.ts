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
  paymentToken?: string
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
  billing: BillingDetails
  provider?: string
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
      processor = 'mobius',
      provider,
      paymentToken,
      billing,
      idempotencyKey,
    }: SubscribeWithCardParams): Promise<CheckoutResponse> => {
      if (processor !== 'ccbill' && !paymentToken) {
        throw new Error('payments-ui: payment token is required for card checkout')
      }

      const payment: CheckoutRequestPayload['payment'] = {
        processor,
        email: billing.email,
        first_name: billing.firstName,
        last_name: billing.lastName,
        address1: billing.address1,
        city: billing.city,
        state: billing.stateRegion,
        zip: billing.postalCode,
        country: billing.country,
      }

      if (paymentToken) {
        payment.payment_token = paymentToken
        payment.last_four = billing.last_four
        payment.card_type = billing.card_type
        payment.expiry_date = billing.expiry_date
      }

      const payload: CheckoutRequestPayload = {
        price_id: ensurePrice(priceId),
        provider,
        payment,
      }

      return client.checkout(payload, idempotencyKey)
    },
    [client]
  )

  const subscribeWithSavedMethod = useCallback(
    async ({
      priceId,
      processor = 'mobius',
      provider,
      paymentMethodId,
      email,
      idempotencyKey,
    }: SubscribeWithSavedMethodParams): Promise<CheckoutResponse> => {
      const payload: CheckoutRequestPayload = {
        price_id: ensurePrice(priceId),
        provider,
        payment: {
          processor,
          payment_method_id: paymentMethodId,
          email,
        },
      }
      return client.checkout(payload, idempotencyKey)
    },
    [client]
  )


  const subscribeWithCCBill = useCallback(
    async ({
      priceId,
      billing,
      provider,
      processor = 'ccbill',
      idempotencyKey,
    }: SubscribeWithCCBillParams): Promise<CheckoutResponse> => {
      const payload: CheckoutRequestPayload = {
        price_id: ensurePrice(priceId),
        provider,
        payment: {
          processor,
          email: billing.email,
          first_name: billing.firstName,
          last_name: billing.lastName,
          address1: billing.address1,
          city: billing.city,
          state: billing.stateRegion,
          zip: billing.postalCode,
          country: billing.country,
        },
      }
      return client.checkout(payload, idempotencyKey)
    },
    [client]
  )

  return {
    subscribeWithCard,
    subscribeWithSavedMethod,
    subscribeWithCCBill
  }
}
