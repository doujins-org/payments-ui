import { useCallback, useEffect, useState } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import type { SolanaWallet } from '../types'

interface UseWalletListOptions {
  autoFetch?: boolean
}

interface WalletListState {
  wallets: SolanaWallet[]
  isLoading: boolean
  error: string | null
}

export const useWalletList = (
  options: UseWalletListOptions = {}
) => {
  const { services } = usePaymentContext()
  const [state, setState] = useState<WalletListState>({
    wallets: [],
    isLoading: false,
    error: null,
  })

  const fetchWallets = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const wallets = await services.solanaWallets.list()
      setState({ wallets, isLoading: false, error: null })
      return wallets
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load wallets'
      console.error('payments-ui: wallet list fetch failed', error)
      setState((prev) => ({ ...prev, isLoading: false, error: message }))
      throw error
    }
  }, [services.solanaWallets])

  const deleteWallet = useCallback(
    async (walletIdOrAddress: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      try {
        await services.solanaWallets.remove(walletIdOrAddress)
        setState((prev) => ({
          ...prev,
          wallets: prev.wallets.filter(
            (wallet) => wallet.id !== walletIdOrAddress && wallet.address !== walletIdOrAddress
          ),
          isLoading: false,
        }))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to remove wallet'
        console.error('payments-ui: wallet removal failed', error)
        setState((prev) => ({ ...prev, isLoading: false, error: message }))
        throw error
      }
    },
    [services.solanaWallets]
  )

  const addWallet = useCallback((wallet: SolanaWallet) => {
    setState((prev) => ({ ...prev, wallets: [...prev.wallets, wallet] }))
  }, [])

  const updateWallet = useCallback((walletId: string, updates: Partial<SolanaWallet>) => {
    setState((prev) => ({
      ...prev,
      wallets: prev.wallets.map((wallet) =>
        wallet.id === walletId ? { ...wallet, ...updates } : wallet
      ),
    }))
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const findWalletByAddress = useCallback(
    (address: string) => state.wallets.find((wallet) => wallet.address === address),
    [state.wallets]
  )

  const getVerifiedWallets = useCallback(
    () => state.wallets.filter((wallet) => wallet.is_verified),
    [state.wallets]
  )

  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchWallets().catch(() => {
        /* error handled above */
      })
    }
  }, [fetchWallets, options.autoFetch])

  return {
    wallets: state.wallets,
    isLoading: state.isLoading,
    error: state.error,
    fetchWallets,
    deleteWallet,
    addWallet,
    updateWallet,
    clearError,
    findWalletByAddress,
    getVerifiedWallets,
    hasVerifiedWallets: state.wallets.some((w) => w.is_verified),
    totalWallets: state.wallets.length,
  }
}
