import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PaymentConfig } from '../types/config'
import { loadCollectJs } from '../utils/collect'
import { createClient, type Client } from '../lib/client'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import '@solana/wallet-adapter-react-ui/styles.css'
import {
  WalletAdapterNetwork,
  type WalletAdapter,
} from '@solana/wallet-adapter-base'
import { clusterApiUrl } from '@solana/web3.js'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust'
import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase'
import { PaymentsDialogProvider } from './PaymentsDialogContext'

export interface PaymentContextValue {
  config: PaymentConfig
  client: Client
  queryClient: QueryClient
}

export const PaymentContext = createContext<PaymentContextValue | undefined>(undefined)

export interface PaymentProviderProps {
  config: PaymentConfig
  children: React.ReactNode
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({
  config,
  children,
}) => {
  const queryClient = useMemo(() => {
    return new QueryClient({
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
  }, [])

  const client = useMemo(() => {
    const authProvider = config.getAuthToken
      ? async () => {
          try {
            const result = config.getAuthToken?.()
            if (result instanceof Promise) {
              return (await result) ?? null
            }
            return result ?? null
          } catch (error) {
            console.warn('payments-ui: failed to resolve auth token', error)
            return null
          }
        }
      : undefined

    const wrappedFetch = config.fetcher
      ? ((input: RequestInfo | URL, init?: RequestInit) => {
          const normalizedInput = input instanceof URL ? input.toString() : input
          return config.fetcher!(normalizedInput as RequestInfo, init)
        })
      : undefined

    return createClient({
      billingBaseUrl: config.endpoints.billingBaseUrl,
      billingBasePath: config.endpoints.billingBasePath,
      accountBaseUrl: config.endpoints.accountBaseUrl,
      accountBasePath: config.endpoints.accountBasePath,
      getAuthToken: authProvider,
      defaultHeaders: config.defaultHeaders,
      fetch: wrappedFetch,
    })
  }, [config])

  const solanaEndpoint = useMemo(() => {
    if (config.solana?.endpoint) return config.solana.endpoint
    const network = config.solana?.network ?? WalletAdapterNetwork.Mainnet
    return clusterApiUrl(network)
  }, [config.solana?.endpoint, config.solana?.network])

  const walletAdapters = useMemo<WalletAdapter[]>(() => {
    if (config.solana?.wallets?.length) {
      return config.solana.wallets
    }
    
    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TrustWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ]
  }, [config.solana?.wallets])

  const autoConnect = config.solana?.autoConnect ?? true

  const value = useMemo<PaymentContextValue>(() => {
    return {
      config,
      client,
      queryClient,
    }
  }, [client, config, queryClient])

  useEffect(() => {
    if (!config.collectJsKey) return
    loadCollectJs(config.collectJsKey)
  }, [config.collectJsKey])

  return (
    <PaymentContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        <ConnectionProvider endpoint={solanaEndpoint} config={{ commitment: 'confirmed' }}>
          <WalletProvider wallets={walletAdapters} autoConnect={autoConnect}>
            <WalletModalProvider>
              <PaymentsDialogProvider>{children}</PaymentsDialogProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </QueryClientProvider>
    </PaymentContext.Provider>
  )
}

export const usePaymentContext = (): PaymentContextValue => {
  const context = useContext(PaymentContext)
  if (!context) {
    throw new Error('usePaymentContext must be used within a PaymentProvider')
  }
  return context
}
