import { useCallback, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'
import { usePaymentContext } from '../context/PaymentContext'

interface WalletVerificationState {
  isVerifying: boolean
  isVerified: boolean
  error: string | null
}

export const useWalletVerification = () => {
  const { services } = usePaymentContext()
  const { publicKey, signMessage } = useWallet()
  const [state, setState] = useState<WalletVerificationState>({
    isVerifying: false,
    isVerified: false,
    error: null,
  })

  const signAndVerifyWallet = useCallback(
    async (walletAddress: string, message: string, nonce?: string) => {
      if (!publicKey || !signMessage) {
        throw new Error('Wallet not connected or signing unavailable')
      }

      if (publicKey.toBase58() !== walletAddress) {
        throw new Error('Connected wallet does not match target wallet')
      }

      setState((prev) => ({ ...prev, isVerifying: true, error: null }))

      try {
        const encodedMessage = new TextEncoder().encode(message)
        const signature = await signMessage(encodedMessage)
        const signatureBase58 = bs58.encode(signature)

        const response = await services.solanaWallets.verify(
          walletAddress,
          signatureBase58,
          nonce
        )

        setState({ isVerifying: false, isVerified: response.verified, error: null })
        return response
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Wallet verification failed'
        console.error('payments-ui: wallet verification failed', error)
        setState({ isVerifying: false, isVerified: false, error: message })
        throw error
      }
    },
    [publicKey, signMessage, services.solanaWallets]
  )

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  const resetVerification = useCallback(() => {
    setState({ isVerifying: false, isVerified: false, error: null })
  }, [])

  const autoVerifyWallet = useCallback(
    async (walletAddress: string, message: string, nonce?: string) => {
      try {
        return await signAndVerifyWallet(walletAddress, message, nonce)
      } catch (error) {
        console.warn('payments-ui: auto-verification skipped', error)
        return null
      }
    },
    [signAndVerifyWallet]
  )

  return {
    ...state,
    signAndVerifyWallet,
    autoVerifyWallet,
    clearError,
    resetVerification,
  }
}
