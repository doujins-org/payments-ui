import React, { createContext, useContext, useEffect, useMemo } from 'react'
import type { StoreApi } from 'zustand'
import type { PaymentConfig, PaymentFetcher } from '../types/config'
import { loadCollectJs } from '../utils/collect'
import { PaymentApp, type PaymentServices } from '../core'
import {
  createPaymentStore,
  type PaymentStoreState,
} from '../state/paymentStore'

export interface PaymentContextValue {
  config: PaymentConfig
  fetcher: PaymentFetcher
  resolveAuthToken: () => Promise<string | null>
  app: PaymentApp
  services: PaymentServices
  store: StoreApi<PaymentStoreState>
}

const PaymentContext = createContext<PaymentContextValue | undefined>(undefined)

export interface PaymentProviderProps {
  config: PaymentConfig
  children: React.ReactNode
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({
  config,
  children,
}) => {
  const app = useMemo(() => new PaymentApp({ config }), [config])
  const store = useMemo(
    () => createPaymentStore({ callbacks: config.callbacks }),
    [config.callbacks]
  )

  const value = useMemo<PaymentContextValue>(() => {
    return {
      config: app.getConfig(),
      fetcher: app.getFetcher(),
      resolveAuthToken: app.resolveAuthToken,
      app,
      services: app.getServices(),
      store,
    }
  }, [app, store])

  useEffect(() => {
    if (!value.config.collectJsKey) return
    loadCollectJs(value.config.collectJsKey)
  }, [value.config.collectJsKey])

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
}

export const usePaymentContext = (): PaymentContextValue => {
  const context = useContext(PaymentContext)
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider')
  }
  return context
}
