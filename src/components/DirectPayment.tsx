import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  Connection,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js'
import { Loader2, Wallet } from 'lucide-react'
import { Buffer } from 'buffer'
import { useSolanaService } from '../services/solana'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import {
  fetchSupportedTokenBalances,
  hasSufficientBalance,
} from '../utils/solana'
import { usePaymentContext } from '../context/PaymentContext'

interface DirectPaymentProps {
  priceId: string
  tokenAmount: number
  selectedToken: TokenInfo | null
  supportedTokens: TokenInfo[]
  onPaymentStart: () => void
  onPaymentConfirming: () => void
  onPaymentSuccess: (result: SubmitPaymentResponse, txId: string) => void
  onPaymentError: (error: string) => void
}

interface TokenBalanceState {
  balance: number
  hasBalance: boolean
}

export const DirectPayment: React.FC<DirectPaymentProps> = ({
  priceId,
  tokenAmount,
  selectedToken,
  supportedTokens,
  onPaymentStart,
  onPaymentConfirming,
  onPaymentSuccess,
  onPaymentError,
}) => {
  const { connected, publicKey, wallet, signTransaction } = useWallet()
  const { config } = usePaymentContext()
  const solanaService = useSolanaService()
  const [tokenBalance, setTokenBalance] = useState<TokenBalanceState | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false)

  const connection = useMemo(() => {
    const rpc = config.solanaRpcUrl ?? 'https://api.mainnet-beta.solana.com'
    return new Connection(rpc)
  }, [config.solanaRpcUrl])

  useEffect(() => {
    if (connected && publicKey && selectedToken) {
      void fetchTokenBalance()
    }
  }, [connected, publicKey, selectedToken, tokenAmount])

  const fetchTokenBalance = useCallback(async () => {
    if (!connected || !publicKey || !selectedToken) {
      setTokenBalance({ balance: 0, hasBalance: false })
      return
    }

    try {
      setIsLoadingBalance(true)
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
      setIsLoadingBalance(false)
    }
  }, [connected, publicKey, connection, selectedToken, tokenAmount, supportedTokens])

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

  const handlePayment = async () => {
    if (!connected || !publicKey) {
      onPaymentError('Wallet not connected')
      return
    }

    if (!selectedToken) {
      onPaymentError('No payment token selected')
      return
    }

    if (!tokenBalance?.hasBalance) {
      onPaymentError('Insufficient balance for this token')
      return
    }

    try {
      setIsPaymentProcessing(true)
      onPaymentStart()

      const paymentData = await solanaService.generatePayment(
        priceId,
        selectedToken.symbol,
        publicKey.toBase58()
      )

      const transactionToSign = decodeTransaction(paymentData.transaction)
      const signedTx = await signWithWallet(transactionToSign)
      const signedSerialized = Buffer.from(signedTx.serialize()).toString('base64')

      onPaymentConfirming()

      const result = await solanaService.submitPayment(
        signedSerialized,
        priceId,
        paymentData.intent_id,
        `Payment for subscription - ${selectedToken.symbol}`
      )

      onPaymentSuccess(result, result.transaction_id)
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

      onPaymentError(errorMessage)
    } finally {
      setIsPaymentProcessing(false)
    }
  }

  return (
    <div className="payments-ui-panel">
      <div className="payments-ui-panel-header">
        <div>
          <p className="payments-ui-panel-title">
            <Wallet className="payments-ui-icon" /> Pay with connected wallet
          </p>
          <p className="payments-ui-panel-description">
            Sign the transaction directly in your Solana wallet.
          </p>
        </div>
      </div>

      <div className="payments-ui-panel-body">
        <div className="payments-ui-balance-row">
          <span>Available balance</span>
          {isLoadingBalance ? (
            <Loader2 className="payments-ui-spinner" />
          ) : (
            <strong>
              {tokenBalance?.balance?.toFixed(4)} {selectedToken?.symbol}
            </strong>
          )}
        </div>

        <button
          type="button"
          className="payments-ui-button"
          disabled={
            isPaymentProcessing || !connected || !tokenBalance?.hasBalance
          }
          onClick={handlePayment}
        >
          {isPaymentProcessing ? (
            <Loader2 className="payments-ui-spinner" />
          ) : (
            <Wallet className="payments-ui-icon" />
          )}
          {isPaymentProcessing ? 'Processing...' : 'Pay with wallet'}
        </button>
      </div>
    </div>
  )
}
