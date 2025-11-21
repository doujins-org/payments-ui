import { useCallback, useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { WalletChallengeResponse, WalletConnectionState } from '../types'
import { usePaymentContext } from '../context/PaymentContext'

interface WalletConnectionResult extends WalletConnectionState {
  walletName?: string
  walletIcon?: string
  connectWallet: () => Promise<void>
  disconnectWallet: () => Promise<void>
  connectWalletToBackend: (address: string) => Promise<WalletChallengeResponse>
  clearError: () => void
}

export const useWalletConnection = (): WalletConnectionResult => {
  const { services } = usePaymentContext()
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet()
  const [state, setState] = useState<WalletConnectionState>({
    isConnected: false,
    isConnecting: false,
    publicKey: null,
    wallets: [],
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isConnected: connected,
      isConnecting: connecting,
      publicKey: publicKey?.toBase58() ?? null,
    }))
  }, [connected, connecting, publicKey])

  const connectWalletToBackend = useCallback(
    async (address: string) => {
      if (!address) {
        throw new Error('Wallet address is required')
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      try {
        const challenge = await services.solanaWallets.requestChallenge(address)
        setState((prev) => ({ ...prev, isLoading: false }))
        return challenge
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Wallet challenge failed'
        console.error('payments-ui: wallet challenge failed', error)
        setState((prev) => ({ ...prev, isLoading: false, error: message }))
        throw error
      }
    },
    [services.solanaWallets]
  )

  const connectWallet = useCallback(async () => {
    if (!wallet) {
      throw new Error('No wallet adapter selected')
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }))

    try {
      await wallet.adapter.connect()
      if (publicKey) {
        await connectWalletToBackend(publicKey.toBase58())
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to connect wallet'
      console.error('payments-ui: wallet connection failed', error)
      setState((prev) => ({ ...prev, isConnecting: false, error: message }))
      throw error
    } finally {
      setState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [wallet, publicKey, connectWalletToBackend])

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect()
      setState((prev) => ({
        ...prev,
        isConnected: false,
        publicKey: null,
        wallets: [],
        error: null,
      }))
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to disconnect wallet'
      console.error('payments-ui: wallet disconnect failed', error)
      setState((prev) => ({ ...prev, error: message }))
      throw error
    }
  }, [disconnect])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    walletName: wallet?.adapter.name,
    walletIcon: wallet?.adapter.icon,
    connectWallet,
    disconnectWallet,
    connectWalletToBackend,
    clearError,
  }
}
