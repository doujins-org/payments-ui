import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { TokenInfo, SubmitPaymentResponse } from '../types'
import { useSolanaService } from '../services/solana'

interface DirectPaymentState {
  loading: boolean
  error: string | null
  success: boolean
  transactionId: string | null
}

interface UseDirectWalletPaymentReturn {
  paymentState: DirectPaymentState
  payWithWallet: (token: TokenInfo, priceId: string) => Promise<void>
  resetPayment: () => void
}

export const useDirectWalletPayment = (): UseDirectWalletPaymentReturn => {
  const { publicKey, signTransaction, connected } = useWallet()
  const solanaService = useSolanaService()

  const [paymentState, setPaymentState] = useState<DirectPaymentState>({
    loading: false,
    error: null,
    success: false,
    transactionId: null,
  })

  const resetPayment = useCallback(() => {
    setPaymentState({
      loading: false,
      error: null,
      success: false,
      transactionId: null,
    })
  }, [])

  const payWithWallet = useCallback(
    async (token: TokenInfo, priceId: string) => {
      if (!connected || !publicKey || !signTransaction) {
        setPaymentState((prev) => ({
          ...prev,
          error: 'Wallet not connected. Please connect your wallet first.',
        }))
        return
      }

      setPaymentState({
        loading: true,
        error: null,
        success: false,
        transactionId: null,
      })

      try {
        console.log('Generating payment transaction...', {
          token: token.symbol,
          priceId,
        })
        const paymentData = await solanaService.generatePayment(
          priceId,
          token.symbol,
          publicKey.toBase58()
        )

        const transactionBuffer = Buffer.from(paymentData.transaction, 'base64')
        const transaction = Transaction.from(transactionBuffer)

        console.log('Requesting wallet signature...')
        const signedTransaction = await signTransaction(transaction)

        const signedTransactionBase64 = signedTransaction
          .serialize()
          .toString('base64')

        console.log('Submitting signed transaction...')
        const submitResult: SubmitPaymentResponse = await solanaService.submitPayment(
          signedTransactionBase64,
          priceId,
          paymentData.intent_id
        )

        setPaymentState({
          loading: false,
          error: null,
          success: true,
          transactionId: submitResult.transaction_id,
        })

        console.log('Payment successful!', submitResult)
      } catch (err: unknown) {
        console.error('Payment failed:', err)

        let errorMessage = 'Payment failed. Please try again.'
        const message =
          err instanceof Error ? err.message : typeof err === 'string' ? err : ''

        if (message.includes('User rejected')) {
          errorMessage = 'Payment cancelled by user.'
        } else if (/insufficient\s+funds/i.test(message)) {
          errorMessage = `Insufficient ${token.symbol} balance.`
        } else if (/network/i.test(message)) {
          errorMessage = 'Network error. Please check your connection.'
        } else if (message) {
          errorMessage = message
        }

        setPaymentState({
          loading: false,
          error: errorMessage,
          success: false,
          transactionId: null,
        })
      }
    },
    [connected, publicKey, signTransaction, solanaService]
  )

  return {
    paymentState,
    payWithWallet,
    resetPayment,
  }
}
