import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  BillingDetails,
  CreatePaymentMethodPayload,
  PaymentMethod,
  PaginatedPaymentMethods,
} from '../types'
import { usePaymentContext } from '../context/PaymentContext'

const PAYMENT_METHODS_KEY = ['payments-ui', 'payment-methods']

export const usePaymentMethods = () => {
  const { client } = usePaymentContext()
  const queryClient = useQueryClient()

  const listQuery = useQuery<PaginatedPaymentMethods>({
    queryKey: PAYMENT_METHODS_KEY,
    queryFn: async () => {
      const response = await client.listPaymentMethods({ limit: 50 })
      return {
        data: response.data,
        total_items: response.total,
        limit: response.limit,
        offset: response.offset,
        page: response.limit > 0 ? Math.floor(response.offset / response.limit) + 1 : 1,
        page_size: response.limit,
        total_pages:
          response.limit > 0 ? Math.ceil(response.total / response.limit) : undefined,
      }
    },
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
        last_four: billing.last_four,
        card_type: billing.card_type,
      }
      return client.createPaymentMethod(payload)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY })
    },
  })

  const deleteMutation = useMutation<void, Error, { id: string }>({
    mutationFn: ({ id }) => client.deletePaymentMethod(id),
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
