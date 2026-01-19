import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { QRCodePayment } from './QRCodePayment'
import { PaymentStatus } from './PaymentStatus'
import { useSupportedTokens } from '../hooks/useSupportedTokens'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Button } from '../components/ui/button'
import { usePaymentNotifications } from '../hooks/usePaymentNotifications'

type SolanaFlowState = 'selecting' | 'processing' | 'confirming' | 'success' | 'error'

export interface SolanaPaymentViewProps {
  priceId: string
  usdAmount: number
  checkoutSessionId?: string
  walletId?: string
  wallet?: string
  onSuccess: (result: SubmitPaymentResponse | string) => void
  onError?: (error: string) => void
  onClose?: () => void
}

export const SolanaPaymentView: React.FC<SolanaPaymentViewProps> = ({
  priceId,
  usdAmount,
  checkoutSessionId,
  walletId,
  wallet,
  onSuccess,
  onError,
  onClose,
}) => {
  const { publicKey } = useWallet()
  const { notifyStatus, notifyError, notifySuccess } = usePaymentNotifications()
  const [paymentState, setPaymentState] = useState<SolanaFlowState>('selecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string | null>(null)

  const walletAddress = useMemo(() => {
    if (wallet && wallet.trim()) return wallet.trim()
    if (!publicKey) return undefined
    return publicKey.toBase58()
  }, [publicKey, wallet])

  const {
    tokens,
    isLoading: tokensLoading,
    error: tokensError,
  } = useSupportedTokens({
    checkoutSessionId,
    walletId,
    wallet: walletAddress,
    priceId,
  })

  const selectedToken = useMemo<TokenInfo | null>(() => {
    if (!tokens.length) return null
    const explicit = tokens.find((token) => token.symbol === selectedTokenSymbol)
    return explicit || tokens[0]
  }, [tokens, selectedTokenSymbol])

  useEffect(() => {
    if (!selectedTokenSymbol && tokens.length) {
      const defaultToken =
        tokens.find((token) => token.symbol === 'SOL') || tokens[0]
      setSelectedTokenSymbol(defaultToken.symbol)
    }
  }, [tokens, selectedTokenSymbol])

  const selectedTokenAmount = useMemo(() => {
    if (!selectedToken || usdAmount === 0) return 0

    const quote = selectedToken.quote?.token_amount
    if (typeof quote === 'string') {
      const parsed = Number.parseFloat(quote)
      if (Number.isFinite(parsed)) return parsed
    }

    const price = selectedToken.price ?? 0
    if (!price || price <= 0) return 0
    return usdAmount / price
  }, [selectedToken, usdAmount])

  const formatTokenAmount = useCallback((token: TokenInfo) => {
    const quote = token.quote?.token_amount
    if (typeof quote === 'string' && quote.trim()) {
      const parsed = Number.parseFloat(quote)
      if (Number.isFinite(parsed)) {
        return token.symbol === 'SOL' ? parsed.toFixed(4) : parsed.toFixed(2)
      }
      return quote
    }

    const price = token.price ?? 0
    if (!price || price <= 0) return '0'
    const approx = usdAmount / price
    return token.symbol === 'SOL' ? approx.toFixed(4) : approx.toFixed(2)
  }, [usdAmount])

  const handlePaymentSuccess = useCallback(
    (result: SubmitPaymentResponse | string, txId?: string) => {
      const resolvedTx = txId || (typeof result === 'string' ? result : result.transaction_id)
      setTransactionId(resolvedTx)
      setPaymentState('success')
      setErrorMessage(null)

      const payload =
        typeof result === 'string'
          ? {
              transactionId: resolvedTx,
              processor: 'solana',
              metadata: { source: 'solana-pay' },
            }
          : {
              transactionId: result.transaction_id,
              intentId: result.intent_id,
              processor: 'solana',
              metadata: {
                purchaseId: result.purchase_id,
                amount: result.amount,
                currency: result.currency,
              },
            }

      notifyStatus('success', { source: 'solana' })
      notifySuccess(payload)

      setTimeout(() => {
        onSuccess(result)
      }, 1500)
    },
    [notifyStatus, notifySuccess, onSuccess]
  )

  const handlePaymentError = useCallback(
    (error: string) => {
      setPaymentState('error')
      setErrorMessage(error)
      notifyStatus('error', { source: 'solana' })
      notifyError(error)
      onError?.(error)
    },
    [notifyError, notifyStatus, onError]
  )

  const resetState = useCallback(() => {
    setPaymentState('selecting')
    setErrorMessage(null)
    setTransactionId(null)
  }, [])

  const handleRetry = useCallback(() => {
    resetState()
  }, [resetState])

  const handleClose = useCallback(() => {
    if (paymentState === 'processing' || paymentState === 'confirming') {
      return
    }

    resetState()
    onClose?.()
  }, [paymentState, onClose, resetState])

  const handleTokenChange = useCallback((value: string) => {
    setSelectedTokenSymbol(value)
  }, [])

  const renderBody = () => {
    if (paymentState !== 'selecting') {
      return (
        <PaymentStatus
          state={paymentState}
          usdAmount={usdAmount}
          solAmount={selectedTokenAmount}
          onRetry={handleRetry}
          onClose={handleClose}
          errorMessage={errorMessage}
          transactionId={transactionId}
        />
      )
    }

    if (tokensLoading) {
      return (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading supported tokens…
        </div>
      )
    }

    if (tokensError) {
      return <p className="text-sm text-destructive">{tokensError}</p>
    }

    if (!tokens.length) {
      return <p className="text-sm text-muted-foreground">No payment tokens available.</p>
    }

    return (
      <div className="space-y-6">
        <div className="space-y-1 text-center">
          <p className="text-sm text-muted-foreground">Amount due</p>
          <p className="text-3xl font-semibold text-foreground">${usdAmount.toFixed(2)} USD</p>
          {selectedToken && selectedTokenAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              ≈ {selectedTokenAmount.toFixed(selectedToken.symbol === 'SOL' ? 4 : 2)} {selectedToken.symbol}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Select token</p>
          <Select value={selectedToken?.symbol ?? ''} onValueChange={handleTokenChange}>
            <SelectTrigger className="border bg-transparent">
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {tokens.map((token) => (
                <SelectItem key={token.symbol} value={token.symbol}>
                  <div className="flex w-full items-center justify-between gap-4">
                    <span>
                      {token.name} ({token.symbol})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTokenAmount(token)} {token.symbol}
                      {token.balance?.amount
                        ? ` · bal ${token.balance.amount} ${token.symbol}`
                        : null}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!walletAddress && (
            <p className="text-xs text-muted-foreground">
              Connect a wallet to show token balances.
            </p>
          )}
        </div>

        <QRCodePayment
          priceId={priceId}
          selectedToken={selectedToken}
          onPaymentError={handlePaymentError}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Solana Pay checkout</p>
          <p className="text-2xl font-semibold text-foreground">Pay with Solana</p>
          <p className="text-sm text-muted-foreground">
            Choose a supported token and send the payment via Solana Pay QR code.
          </p>
        </div>
        {onClose && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleClose}
            disabled={paymentState === 'processing' || paymentState === 'confirming'}
            className="h-8 px-3 text-sm"
          >
            Back
          </Button>
        )}
      </div>
      {renderBody()}
    </div>
  )
}
