import React, { createContext, useContext, useEffect, useMemo } from 'react'
import type {
  PaymentConfig,
  PaymentFetcher,
  AuthTokenProvider,
} from '../types/config'
import { loadCollectJs } from '../utils/collect'

export interface PaymentContextValue {
  config: PaymentConfig
  fetcher: PaymentFetcher
  resolveAuthToken: () => Promise<string | null>
}

const PaymentContext = createContext<PaymentContextValue | undefined>(undefined)

export interface PaymentProviderProps {
  config: PaymentConfig
  children: React.ReactNode
}

const resolveTokenProvider = async (
  provider?: AuthTokenProvider
): Promise<string | null> => {
  if (!provider) return null
  try {
    const result = provider()
    if (result instanceof Promise) {
      return (await result) ?? null
    }
    return result ?? null
  } catch (error) {
    console.warn('payments-ui: failed to resolve auth token', error)
    return null
  }
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({
  config,
  children,
}) => {
  const value = useMemo<PaymentContextValue>(() => {
    const fetcher: PaymentFetcher = config.fetcher ?? (globalThis.fetch?.bind(globalThis) as PaymentFetcher)

    return {
      config,
      fetcher,
      resolveAuthToken: async () => resolveTokenProvider(config.getAuthToken),
    }
  }, [config])

  useEffect(() => {
    if (!config.collectJsKey) return
    loadCollectJs(config.collectJsKey)
  }, [config.collectJsKey])

  return <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
}

export const usePaymentContext = (): PaymentContextValue => {
  const context = useContext(PaymentContext)
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider')
  }
  return context
}
