import React from 'react'
import { CheckCircle, Loader2, XCircle, RotateCcw } from 'lucide-react'

interface PaymentStatusProps {
  state: 'selecting' | 'processing' | 'confirming' | 'success' | 'error'
  usdAmount: number
  solAmount: number
  errorMessage?: string | null
  transactionId?: string | null
  onRetry: () => void
  onClose: () => void
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  state,
  usdAmount,
  solAmount,
  errorMessage,
  transactionId,
  onRetry,
  onClose,
}) => {
  if (state === 'success') {
    return (
      <div className="payments-ui-status success">
        <CheckCircle className="payments-ui-status-icon" />
        <h3>Payment confirmed</h3>
        <p>
          {usdAmount.toFixed(2)} USD (~{solAmount.toFixed(4)} SOL).
        </p>
        {transactionId && (
          <p className="payments-ui-status-meta">Txn: {transactionId}</p>
        )}
        <button className="payments-ui-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="payments-ui-status error">
        <XCircle className="payments-ui-status-icon" />
        <h3>Payment failed</h3>
        <p>{errorMessage ?? 'Please try again.'}</p>
        <div className="payments-ui-status-actions">
          <button className="payments-ui-button" type="button" onClick={onRetry}>
            <RotateCcw className="payments-ui-icon" /> Retry
          </button>
          <button className="payments-ui-text-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payments-ui-status pending">
      <Loader2 className="payments-ui-spinner" />
      <h3>
        {state === 'confirming'
          ? 'Waiting for confirmations'
          : 'Processing payment'}
      </h3>
      <p>
        Paying {usdAmount.toFixed(2)} USD (~{solAmount.toFixed(4)} SOL).
      </p>
      <p className="payments-ui-status-meta">
        This can take up to 60 seconds on Solana mainnet.
      </p>
    </div>
  )
}
