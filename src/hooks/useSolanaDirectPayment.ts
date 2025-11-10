import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Buffer } from 'buffer'
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { usePaymentContext } from '../context/PaymentContext'
import { useSolanaService } from './useSolanaService'
import {
  fetchSupportedTokenBalances,
  hasSufficientBalance,
} from '../utils/solana'

interface UseSolanaDirectPaymentOptions {
  priceId: string
  tokenAmount: number
  selectedToken: TokenInfo | null
  supportedTokens: TokenInfo[]
  onStart: () => void
  onConfirming: () => void
  onSuccess: (result: SubmitPaymentResponse, txId: string) => void
  onError: (error: string) => void
}

interface SolanaDirectPaymentState {
  isBalanceLoading: boolean
  isProcessing: boolean
  balanceLabel: string
  canPay: boolean
  pay: () => Promise<void>
}

interface TokenBalanceState {
  balance: number
  hasBalance: boolean
}

export const useSolanaDirectPayment = (
  options: UseSolanaDirectPaymentOptions
): SolanaDirectPaymentState => {
  const { priceId, tokenAmount, selectedToken, supportedTokens, onStart, onConfirming, onSuccess, onError } = options
  const { connected, publicKey, wallet, signTransaction } = useWallet()
  const { config } = usePaymentContext()
  const solanaService = useSolanaService()

  const [tokenBalance, setTokenBalance] = useState<TokenBalanceState | null>(null)
  const [isBalanceLoading, setIsBalanceLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const connection = useMemo(() => {
    const rpc = config.solanaRpcUrl ?? 'https://api.mainnet-beta.solana.com'
    return new Connection(rpc)
  }, [config.solanaRpcUrl])

  const fetchTokenBalance = useCallback(async () => {
    if (!connected || !publicKey || !selectedToken) {
      setTokenBalance({ balance: 0, hasBalance: false })
      return
    }

    try {
      setIsBalanceLoading(true)
      const balances = await fetchSupportedTokenBalances(
        connection,
        publicKey,
        supportedTokens
      )
      const balanceInfo = balances.find(
        (tb) => tb.symbol === selectedToken.symbol || tb.mint === selectedToken.mint
      )

      const balance = balanceInfo?.balance || 0
      const hasBalanceFlag = hasSufficientBalance(balance, tokenAmount)

      setTokenBalance({ balance, hasBalance: hasBalanceFlag })
    } catch (error) {
      console.error('Failed to fetch token balance:', error)
      setTokenBalance({ balance: 0, hasBalance: false })
    } finally {
      setIsBalanceLoading(false)
    }
  }, [connected, publicKey, connection, selectedToken, tokenAmount, supportedTokens])

  useEffect(() => {
    if (connected && publicKey && selectedToken) {
      void fetchTokenBalance()
    }
  }, [connected, publicKey, selectedToken, tokenAmount, fetchTokenBalance])

  const decodeTransaction = useCallback((serialized: string) => {
    const buffer = Buffer.from(serialized, 'base64')
    try {
      return VersionedTransaction.deserialize(buffer)
    } catch (err) {
      try {
        return Transaction.from(buffer)
      } catch (legacyErr) {
        console.error('Failed to deserialize transaction', legacyErr)
        throw new Error('Invalid transaction payload received from server')
      }
    }
  }, [])

  const isVersionedTransaction = (tx: unknown): tx is VersionedTransaction => {
    return !!tx && typeof tx === 'object' && 'version' in tx
  }

  const signWithWallet = useCallback(
    async (tx: Transaction | VersionedTransaction) => {
      if (!wallet) {
        throw new Error('Wallet adapter is not available')
      }

      const adapter = wallet.adapter as unknown as {
        signTransaction?: (transaction: Transaction) => Promise<Transaction>
        signVersionedTransaction?: (
          transaction: VersionedTransaction
        ) => Promise<VersionedTransaction>
        supportedTransactionVersions?: Set<number | 'legacy'> | null
      }

      if (isVersionedTransaction(tx)) {
        if (adapter.supportedTransactionVersions) {
          const supported = adapter.supportedTransactionVersions
          if (!supported.has(tx.version)) {
            throw new Error('Connected wallet does not support this transaction version')
          }
        }

        if (adapter.signVersionedTransaction) {
          return adapter.signVersionedTransaction(tx)
        }
      }

      if (adapter.signTransaction) {
        return adapter.signTransaction(tx as Transaction)
      }

      if (signTransaction) {
        return signTransaction(tx as Transaction)
      }

      throw new Error('Connected wallet cannot sign transactions')
    },
    [wallet, signTransaction]
  )

  const pay = useCallback(async () => {
    if (!connected || !publicKey) {
      onError('Wallet not connected')
      return
    }

    if (!selectedToken) {
      onError('No payment token selected')
      return
    }

    if (!tokenBalance?.hasBalance) {
      onError('Insufficient balance for this token')
      return
    }

    try {
      setIsProcessing(true)
      onStart()

      const paymentData = await solanaService.generatePayment(
        priceId,
        selectedToken.symbol,
        publicKey.toBase58()
      )

      const transactionToSign = decodeTransaction(paymentData.transaction)
      const signedTx = await signWithWallet(transactionToSign)
      const signedSerialized = Buffer.from(signedTx.serialize()).toString('base64')

      onConfirming()

      const result = await solanaService.submitPayment(
        signedSerialized,
        priceId,
        paymentData.intent_id,
        `Payment for subscription - ${selectedToken.symbol}`
      )

      onSuccess(result, result.transaction_id)
    } catch (err) {
      console.error('Payment failed:', err)

      let errorMessage = 'Payment failed. Please try again.'
      const message =
        err instanceof Error ? err.message : typeof err === 'string' ? err : ''

      if (message.includes('User rejected')) {
        errorMessage = 'Payment cancelled by user'
      } else if (/insufficient\s+funds/i.test(message)) {
        errorMessage = 'Insufficient balance for this token'
      } else if (message) {
        errorMessage = message
      }

      onError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [
    connected,
    publicKey,
    selectedToken,
    tokenBalance?.hasBalance,
    onError,
    onStart,
    solanaService,
    priceId,
    decodeTransaction,
    signWithWallet,
    onConfirming,
    onSuccess,
  ])

  const balanceLabel = tokenBalance
    ? `${tokenBalance.balance.toFixed(4)} ${selectedToken?.symbol ?? ''}`
    : '--'

  return {
    isBalanceLoading,
    isProcessing,
    balanceLabel,
    canPay: Boolean(
      connected && tokenBalance?.hasBalance && !isProcessing
    ),
    pay,
  }
}
