import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaymentMethodService } from './usePaymentMethodService'
import type {
  BillingDetails,
  CreatePaymentMethodPayload,
  PaymentMethod,
  PaginatedPaymentMethods,
} from '../types'

const PAYMENT_METHODS_KEY = ['payments-ui', 'payment-methods']

export const usePaymentMethods = () => {
  const service = usePaymentMethodService()
  const queryClient = useQueryClient()

  const listQuery = useQuery<PaginatedPaymentMethods>({
    queryKey: PAYMENT_METHODS_KEY,
    queryFn: () => service.list({ pageSize: 50 }),
  })

  const createMutation = useMutation<
    PaymentMethod,
    Error,
    { token: string; billing: BillingDetails }
  >({
    mutationFn: ({ token, billing }) => {
      const payload: CreatePaymentMethodPayload = {
        payment_token: token,
        first_name: billing.firstName,
        last_name: billing.lastName,
        address1: billing.address1,
        address2: billing.address2,
        city: billing.city,
        state: billing.stateRegion,
        zip: billing.postalCode,
        country: billing.country,
        email: billing.email,
        provider: billing.provider,
      }
      return service.create(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY })
    },
  })

  const deleteMutation = useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => service.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY })
    },
  })

  return {
    listQuery,
    createMutation,
    deleteMutation,
  }
}
