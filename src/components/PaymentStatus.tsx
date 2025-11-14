import React from 'react'
import { CheckCircle, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '../ui/button'

interface PaymentStatusProps {
  state: 'selecting' | 'processing' | 'confirming' | 'success' | 'error'
  usdAmount: number
  solAmount?: number
  transactionId?: string | null
  errorMessage?: string | null
  onRetry?: () => void
  onClose?: () => void
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  state,
  usdAmount,
  solAmount,
  transactionId,
  errorMessage,
  onRetry,
  onClose,
}) => {
  if (state === 'processing' || state === 'confirming') {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div>
          <p className="text-lg font-semibold text-foreground">
            {state === 'processing' ? 'Processing payment…' : 'Awaiting confirmation…'}
          </p>
          <p className="text-sm text-muted-foreground">
            ${usdAmount.toFixed(2)} {solAmount ? `· ≈ ${solAmount.toFixed(4)} SOL` : ''}
          </p>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="h-12 w-12 text-primary" />
        <div>
          <p className="text-lg font-semibold text-foreground">Payment complete</p>
          {transactionId && (
            <p className="text-xs text-muted-foreground">Txn: {transactionId}</p>
          )}
        </div>
        <Button variant="secondary" onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <XCircle className="h-12 w-12 text-destructive" />
        <div>
          <p className="text-lg font-semibold text-foreground">Payment failed</p>
          {errorMessage && (
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          {onRetry && (
            <Button variant="secondary" className="flex-1" onClick={onRetry}>
              <RotateCcw className="mr-2 h-4 w-4" /> Try again
            </Button>
          )}
          <Button className="flex-1" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    )
  }

  return null
}
