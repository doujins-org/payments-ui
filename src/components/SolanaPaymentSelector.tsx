import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { CreditCard, Loader2, Wallet } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { DirectPayment } from './DirectPayment'
import { QRCodePayment } from './QRCodePayment'
import { PaymentStatus } from './PaymentStatus'
import { useSupportedTokens } from '../hooks/useSupportedTokens'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { cn } from '../lib/utils'
import { usePaymentNotifications } from '../hooks/usePaymentNotifications'

type SolanaFlowState = 'selecting' | 'processing' | 'confirming' | 'success' | 'error'

export interface SolanaPaymentSelectorProps {
  isOpen: boolean
  priceId: string
  usdAmount: number
  onClose: () => void
  onError?: (error: string) => void
  onSuccess: (result: SubmitPaymentResponse | string) => void
}

export const SolanaPaymentSelector: React.FC<SolanaPaymentSelectorProps> = ({
  isOpen,
  onClose,
  priceId,
  usdAmount,
  onSuccess,
  onError,
}) => {
  const { connected } = useWallet()
  const { notifyStatus, notifyError, notifySuccess } = usePaymentNotifications()
  const [activeTab, setActiveTab] = useState<'wallet' | 'qr'>('wallet')
  const [paymentState, setPaymentState] = useState<SolanaFlowState>('selecting')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [tokenAmount, setTokenAmount] = useState(0)
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string | null>(null)

  const {
    tokens,
    isLoading: tokensLoading,
    error: tokensError,
  } = useSupportedTokens()

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
  }, [tokens, selectedTokenSymbol, setSelectedTokenSymbol])

  const handlePaymentStart = useCallback(() => {
    setPaymentState('processing')
    setErrorMessage(null)
    notifyStatus('processing', { source: 'solana' })
  }, [notifyStatus])

  const handlePaymentConfirming = useCallback(() => {
    setPaymentState('confirming')
  }, [])

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

  const handleRetry = useCallback(() => {
    setPaymentState('selecting')
    setErrorMessage(null)
    setTransactionId(null)
  }, [])

  const handleClose = useCallback(() => {
    if (paymentState === 'processing' || paymentState === 'confirming') {
      return
    }

    setPaymentState('selecting')
    setErrorMessage(null)
    setTransactionId(null)
    onClose()
  }, [paymentState, onClose])

  useEffect(() => {
    if (!isOpen || !selectedToken || usdAmount === 0) {
      setTokenAmount(0)
      return
    }

    const price = selectedToken.price ?? 0
    if (!price || price <= 0) {
      setTokenAmount(0)
      return
    }

    setTokenAmount(usdAmount / price)
  }, [isOpen, usdAmount, selectedToken, setTokenAmount])

  const handleTokenChange = useCallback((value: string) => {
    setSelectedTokenSymbol(value)
  }, [])

  const wasConnectedRef = useRef(connected)

  useEffect(() => {
    if (connected && !wasConnectedRef.current) {
      setActiveTab('wallet')
    }

    if (!connected && wasConnectedRef.current) {
      setActiveTab('qr')
    }

    wasConnectedRef.current = connected
  }, [connected])

  const renderBody = () => {
    if (paymentState !== 'selecting') {
      return (
        <PaymentStatus
          state={paymentState}
          usdAmount={usdAmount}
          solAmount={tokenAmount}
          onRetry={handleRetry}
          onClose={handleClose}
          errorMessage={errorMessage}
          transactionId={transactionId}
        />
      )
    }

    if (tokensLoading) {
      return (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading supported tokens…
        </div>
      )
    }

    if (tokensError) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {tokensError}
        </div>
      )
    }

    if (!tokens.length) {
      return (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
          No payment tokens available.
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-background/80 p-5 text-center">
          <p className="text-sm text-muted-foreground">Amount due</p>
          <p className="text-3xl font-semibold text-foreground">${usdAmount.toFixed(2)} USD</p>
          {selectedToken && tokenAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              ≈ {tokenAmount.toFixed(selectedToken.symbol === 'SOL' ? 4 : 2)} {selectedToken.symbol}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Select token</p>
          <Select value={selectedToken?.symbol ?? ''} onValueChange={handleTokenChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select token" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {tokens.map((token) => (
                <SelectItem key={token.symbol} value={token.symbol}>
                  {token.name} ({token.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/80">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'wallet' | 'qr')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-t-2xl bg-muted/10 p-1">
              <TabsTrigger value="wallet" disabled={!connected}>
                <Wallet className="mr-2 h-4 w-4" /> Wallet
              </TabsTrigger>
              <TabsTrigger value="qr">
                <CreditCard className="mr-2 h-4 w-4" /> QR Code
              </TabsTrigger>
            </TabsList>
            <TabsContent value="wallet" className="p-4">
              {activeTab === 'wallet' && (
                <DirectPayment
                  priceId={priceId}
                  tokenAmount={tokenAmount}
                  selectedToken={selectedToken}
                  supportedTokens={tokens}
                  onPaymentStart={handlePaymentStart}
                  onPaymentConfirming={handlePaymentConfirming}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              )}
              {!connected && (
                <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Connect your Solana wallet to continue or switch to QR mode.
                </div>
              )}
            </TabsContent>
            <TabsContent value="qr" className="p-4">
              {activeTab === 'qr' && (
                <QRCodePayment
                  priceId={priceId}
                  selectedToken={selectedToken}
                  onPaymentError={handlePaymentError}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(value) => (value ? undefined : handleClose())}>
      <DialogContent className="w-full max-w-2xl overflow-hidden border border-border/70 bg-background/95 p-0 shadow-2xl">
        <div className="bg-gradient-to-r from-primary/15 via-background/60 to-background px-6 py-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Solana Pay checkout</p>
          <p className="text-2xl font-semibold text-foreground">Pay with Solana</p>
          <p className="text-sm text-muted-foreground">
            Choose a supported token and send the payment with your wallet or a QR code.
          </p>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">
          {renderBody()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
