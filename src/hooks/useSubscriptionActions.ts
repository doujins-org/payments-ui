import { useCallback } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import type { BillingDetails } from '../types/billing'
import type {
  CCBillSubscribePayload,
  FlexFormResponse,
  GenerateFlexFormURLBodyParams,
  NmiSubscribePayload,
  SubscriptionResponse,
} from '../types/subscription'

export interface SubscribeWithCardParams {
  priceId?: string | null
  processor?: string
  provider?: string
  paymentToken: string
  billing: BillingDetails
}

export interface SubscribeWithSavedMethodParams {
  priceId?: string | null
  processor?: string
  provider?: string
  paymentMethodId: string
  email?: string
}

export interface SubscribeWithCCBillParams {
  priceId?: string | null
  email: string
  firstName: string
  lastName: string
  zipCode: string
  country: string
  processor?: string
}

export interface GenerateFlexFormParams {
  priceId?: string | null
  firstName: string
  lastName: string
  address1: string
  city: string
  state: string
  zipCode: string
  country: string
}

export const useSubscriptionActions = () => {
  const { services } = usePaymentContext()

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
    }: SubscribeWithCardParams): Promise<SubscriptionResponse> => {
      const payload: NmiSubscribePayload = {
        priceId: ensurePrice(priceId),
        paymentToken,
        processor,
        provider,
        email: billing.email,
        firstName: billing.firstName,
        lastName: billing.lastName,
        address1: billing.address1,
        city: billing.city,
        state: billing.stateRegion,
        zipCode: billing.postalCode,
        country: billing.country,
      }
      return services.subscriptions.subscribe('nmi', payload)
    },
    [services]
  )

  const subscribeWithSavedMethod = useCallback(
    async ({
      priceId,
      processor = 'nmi',
      provider,
      paymentMethodId,
      email,
    }: SubscribeWithSavedMethodParams): Promise<SubscriptionResponse> => {
      const payload: NmiSubscribePayload = {
        priceId: ensurePrice(priceId),
        paymentMethodId,
        processor,
        provider,
        email,
      }
      return services.subscriptions.subscribe('nmi', payload)
    },
    [services]
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
    }: SubscribeWithCCBillParams): Promise<SubscriptionResponse> => {
      const payload: CCBillSubscribePayload = {
        priceId: ensurePrice(priceId),
        email,
        firstName,
        lastName,
        zipCode,
        country,
        processor,
      }
      return services.subscriptions.subscribe('ccbill', payload)
    },
    [services]
  )

  const generateFlexFormUrl = useCallback(
    async ({
      priceId,
      firstName,
      lastName,
      address1,
      city,
      state,
      zipCode,
      country,
    }: GenerateFlexFormParams): Promise<FlexFormResponse> => {
      const payload: GenerateFlexFormURLBodyParams = {
        price_id: ensurePrice(priceId),
        first_name: firstName,
        last_name: lastName,
        address1,
        city,
        state,
        zip_code: zipCode,
        country,
      }
      return services.subscriptions.generateFlexFormUrl(payload)
    },
    [services]
  )

  return {
    subscribeWithCard,
    subscribeWithSavedMethod,
    subscribeWithCCBill,
    generateFlexFormUrl,
  }
}
