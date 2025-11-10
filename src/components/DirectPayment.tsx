import React from 'react'
import { Loader2, Wallet } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { useSolanaDirectPayment } from '../hooks/useSolanaDirectPayment'

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
          {isBalanceLoading ? (
            <Loader2 className="payments-ui-spinner" />
          ) : (
            <strong>{balanceLabel}</strong>
          )}
        </div>

        <button
          type="button"
          className="payments-ui-button"
          disabled={!canPay}
          onClick={pay}
        >
          {isProcessing ? (
            <Loader2 className="payments-ui-spinner" />
          ) : (
            <Wallet className="payments-ui-icon" />
          )}
          {isProcessing ? 'Processing...' : 'Pay with wallet'}
        </button>
      </div>
    </div>
  )
}
