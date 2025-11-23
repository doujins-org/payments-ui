import { QueryClient } from '@tanstack/react-query'
import type { StoreApi } from 'zustand'
import { PaymentApp, type PaymentServices } from '../core'
import type { PaymentConfig } from '../types/config'
import {
  createPaymentStore,
  type PaymentStoreState,
} from '../state/paymentStore'

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 1,
      },
    },
  })

export class PaymentsRuntime {
  readonly config: PaymentConfig
  readonly app: PaymentApp
  readonly services: PaymentServices
  readonly store: StoreApi<PaymentStoreState>
  readonly queryClient: QueryClient

  constructor(config: PaymentConfig) {
    this.config = config
    this.app = new PaymentApp({ config })
    this.services = this.app.getServices()
    this.store = createPaymentStore({ callbacks: config.callbacks })
    this.queryClient = createQueryClient()
  }
}

export const createPaymentsRuntime = (config: PaymentConfig) =>
  new PaymentsRuntime(config)
