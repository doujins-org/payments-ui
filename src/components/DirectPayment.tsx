import React from 'react'
import { Loader2, Wallet } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { useSolanaDirectPayment } from '../hooks/useSolanaDirectPayment'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

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
  const { isBalanceLoading, balanceLabel, canPay, isProcessing, pay } =
    useSolanaDirectPayment({
      priceId,
      tokenAmount,
      selectedToken,
      supportedTokens,
      onStart: onPaymentStart,
      onConfirming: onPaymentConfirming,
      onSuccess: onPaymentSuccess,
      onError: onPaymentError,
    })

  return (
    <Card className="space-y-4 border border-border/60 bg-background/80 p-6">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Wallet className="h-4 w-4" /> Pay with connected wallet
        </p>
        <p className="text-sm text-muted-foreground">
          Sign the transaction directly in your Solana wallet.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Available balance</span>
        {isBalanceLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <strong className="text-foreground">{balanceLabel}</strong>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={!canPay}
        onClick={pay}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" /> Pay with wallet
          </>
        )}
      </Button>
    </Card>
  )
}
