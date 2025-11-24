import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { PaymentConfig, PaymentFetcher } from '../types/config'
import { loadCollectJs } from '../utils/collect'
import { PaymentsRuntime, createPaymentsRuntime } from '../runtime'
import { PaymentApp, type PaymentServices } from '../core'
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
  fetcher: PaymentFetcher
  resolveAuthToken: () => Promise<string | null>
  app: PaymentApp
  services: PaymentServices
  queryClient: PaymentsRuntime['queryClient']
}

const PaymentContext = createContext<PaymentContextValue | undefined>(undefined)

export interface PaymentProviderProps {
  config: PaymentConfig
  children: React.ReactNode
  runtime?: PaymentsRuntime
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({
  config,
  runtime: runtimeProp,
  children,
}) => {
  const runtime = useMemo(
    () => runtimeProp ?? createPaymentsRuntime(config),
    [runtimeProp, config]
  )

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
      config: runtime.config,
      fetcher: runtime.app.getFetcher(),
      resolveAuthToken: runtime.app.resolveAuthToken,
      app: runtime.app,
      services: runtime.services,
      queryClient: runtime.queryClient,
    }
  }, [runtime])

  useEffect(() => {
    if (!config.collectJsKey) return
    loadCollectJs(config.collectJsKey)
  }, [config.collectJsKey])

  return (
    <PaymentContext.Provider value={value}>
      <QueryClientProvider client={runtime.queryClient}>
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
