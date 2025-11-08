import React, { createContext, useContext, useEffect, useMemo } from 'react'
import type { PaymentConfig, PaymentFetcher } from '../types/config'
import { loadCollectJs } from '../utils/collect'
import { EventEmitter, PaymentApp, ServiceContainer } from '../core'

export interface PaymentContextValue {
  config: PaymentConfig
  fetcher: PaymentFetcher
  resolveAuthToken: () => Promise<string | null>
  app: PaymentApp
  events: EventEmitter
  services: ServiceContainer
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

  const value = useMemo<PaymentContextValue>(() => {
    return {
      config: app.getConfig(),
      fetcher: app.getFetcher(),
      resolveAuthToken: app.resolveAuthToken,
      app,
      events: app.getEvents(),
      services: app.getServices(),
    }
  }, [app])

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
