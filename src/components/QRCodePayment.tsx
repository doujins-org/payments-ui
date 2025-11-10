import React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { useSolanaQrPayment } from '../hooks/useSolanaQrPayment'

interface QRCodePaymentProps {
  priceId: string
  selectedToken: TokenInfo | null
  onPaymentError: (error: string) => void
  onPaymentSuccess: (result: SubmitPaymentResponse | string, txId: string) => void
}

export const QRCodePayment: React.FC<QRCodePaymentProps> = ({
  priceId,
  selectedToken,
  onPaymentError,
  onPaymentSuccess,
}) => {
  const { intent, qrDataUri, isLoading, error, timeRemaining, refresh } =
    useSolanaQrPayment({
      priceId,
      selectedToken,
      onError: onPaymentError,
      onSuccess: onPaymentSuccess,
    })

  if (!selectedToken) {
    return <div className="payments-ui-empty">Select a token to continue.</div>
  }

  return (
    <div className="payments-ui-panel">
      <div className="payments-ui-panel-header">
        <div>
          <p className="payments-ui-panel-title">Scan with Solana Pay</p>
          <p className="payments-ui-panel-description">
            Use any Solana Pay compatible wallet to scan and confirm.
          </p>
        </div>
        <button
          type="button"
          className="payments-ui-icon-button"
          onClick={() => refresh()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="payments-ui-spinner" />
          ) : (
            <RefreshCw className="payments-ui-icon" />
          )}
        </button>
      </div>

      {error && <div className="payments-ui-error">{error}</div>}

      <div className="payments-ui-qr-wrapper">
        {qrDataUri ? (
          <img src={qrDataUri} alt="Solana Pay QR" />
        ) : (
          <div className="payments-ui-empty">
            {isLoading ? (
              <>
                <Loader2 className="payments-ui-spinner" />
                Generating QR code...
              </>
            ) : (
              'QR code unavailable'
            )}
          </div>
        )}
      </div>

      {intent && (
        <div className="payments-ui-countdown">
          Expires in {timeRemaining}s · {intent.token_amount}{' '}
          {intent.token_symbol}
        </div>
      )}
    </div>
  )
}
