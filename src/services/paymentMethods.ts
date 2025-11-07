import { useCallback } from 'react'
import { useAccountApi } from './useAccountApi'
import type {
  PaginatedPaymentMethods,
  CreatePaymentMethodPayload,
  PaymentMethod,
} from '../types'

export const usePaymentMethodService = () => {
  const api = useAccountApi()

  const list = useCallback(
    async (params?: { page?: number; page_size?: number }) => {
      return api.get<PaginatedPaymentMethods>('/payment-methods', {
        query: {
          page: params?.page ?? 1,
          page_size: params?.page_size ?? 50,
        },
      })
    },
    [api]
  )

  const create = useCallback(
    async (payload: CreatePaymentMethodPayload) => {
      return api.post<PaymentMethod>('/payment-methods', { body: payload })
    },
    [api]
  )

  const remove = useCallback(
    async (id: string) => {
      await api.delete(`/payment-methods/${id}`)
    },
    [api]
  )

  const activate = useCallback(
    async (id: string) => {
      await api.put(`/payment-methods/${id}/activate`)
    },
    [api]
  )

  return {
    list,
    create,
    remove,
    activate,
  }
}
