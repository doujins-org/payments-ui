import type {
  PaginatedPaymentMethods,
  CreatePaymentMethodPayload,
  PaymentMethod,
} from '../types'
import type { ApiClient } from './apiClient'

export interface ListParams {
  page?: number
  pageSize?: number
}

export class PaymentMethodService {
  constructor(private api: ApiClient) { }

  async list(params?: ListParams): Promise<PaginatedPaymentMethods> {
    return this.api.get('/payment-methods', {
      query: {
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 50,
      },
    })
  }

  async create(payload: CreatePaymentMethodPayload): Promise<PaymentMethod> {
    return this.api.post('/payment-methods', {
      body: { ...payload } as Record<string, unknown>,
    })
  }

  async remove(id: string): Promise<void> {
    await this.api.delete(`/payment-methods/${id}`)
  }

  async activate(id: string): Promise<void> {
    await this.api.put(`/payment-methods/${id}/activate`)
  }
}
