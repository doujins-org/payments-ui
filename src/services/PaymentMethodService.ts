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
    const limit = params?.pageSize ?? 50
    const page = params?.page ?? 1
    const offset = (page - 1) * limit
    return this.api.get('/me/payment-methods', {
      query: {
        limit,
        offset,
      },
    })
  }

	async create(payload: CreatePaymentMethodPayload): Promise<PaymentMethod> {
		return this.api.post('/me/payment-methods', {
			body: { ...payload } as Record<string, unknown>,
		})
	}

	async update(id: string, payload: CreatePaymentMethodPayload): Promise<PaymentMethod> {
		return this.api.put(`/me/payment-methods/${id}`, {
			body: { ...payload } as Record<string, unknown>,
		})
	}

	async remove(id: string): Promise<void> {
		await this.api.delete(`/me/payment-methods/${id}`)
	}

  async activate(id: string): Promise<void> {
    await this.api.put(`/me/payment-methods/${id}/activate`)
  }
}
