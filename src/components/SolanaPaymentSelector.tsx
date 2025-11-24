import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { CreditCard, Loader2, Wallet } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { DirectPayment } from './DirectPayment'
import { QRCodePayment } from './QRCodePayment'
import { PaymentStatus } from './PaymentStatus'
import { useSupportedTokens } from '../hooks/useSupportedTokens'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
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

    return (
      <div className="space-y-6">
        {tokensLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading supported tokens…
          </div>
        ) : tokensError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {tokensError}
          </div>
        ) : !tokens.length ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
            No payment tokens available.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-center">
              <div className="text-2xl font-semibold text-foreground">
                ${usdAmount.toFixed(2)} USD
              </div>
              {selectedToken && tokenAmount > 0 && (
                <div className="text-sm text-muted-foreground">
                  ≈ {tokenAmount.toFixed(selectedToken.symbol === 'SOL' ? 4 : 2)} {selectedToken.symbol}
                </div>
              )}
            </div>

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

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'wallet' | 'qr')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-muted/20">
                <TabsTrigger value="wallet" disabled={!connected}>
                  <Wallet className="mr-2 h-4 w-4" /> Pay with Wallet
                </TabsTrigger>
                <TabsTrigger value="qr">
                  <CreditCard className="mr-2 h-4 w-4" /> Scan QR Code
                </TabsTrigger>
              </TabsList>
              <TabsContent value="wallet" className="mt-4">
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
              </TabsContent>
              <TabsContent value="qr" className="mt-4">
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

            {!connected && activeTab === 'wallet' && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                Please connect your Solana wallet to complete this payment, or switch to QR mode.
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle>Complete your payment</DialogTitle>
          <DialogDescription>
            Select a token and preferred method. We’ll guide you through the rest.
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  )
}
