import React, { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { Loader2, RefreshCw } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { useSolanaService } from '../hooks/useSolanaService'

interface QRCodePaymentProps {
  priceId: string
  selectedToken: TokenInfo | null
  onPaymentError: (error: string) => void
  onPaymentSuccess: (result: SubmitPaymentResponse | string, txId: string) => void
}

interface SolanaPayIntent {
  url: string
  amount: number
  token_amount: string
  token_symbol: string
  label: string
  message: string
  expires_at: number
  reference: string
  intent_id: string
}

export const QRCodePayment: React.FC<QRCodePaymentProps> = ({
  priceId,
  selectedToken,
  onPaymentError,
  onPaymentSuccess,
}) => {
  const solanaService = useSolanaService()
  const [qrIntent, setQrIntent] = useState<SolanaPayIntent | null>(null)
  const [qrDataUri, setQrDataUri] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const handleError = useCallback(
    (message: string, notifyParent = false) => {
      clearTimers()
      setError(message)
      setQrIntent(null)
      setQrDataUri(null)
      setTimeRemaining(0)
      if (notifyParent) {
        onPaymentError(message)
      }
    },
    [clearTimers, onPaymentError]
  )

  const pollStatus = useCallback(
    async (reference: string) => {
      try {
        const status = await solanaService.checkPaymentStatus(reference)

        if (status.status === 'confirmed') {
          clearTimers()
          setTimeRemaining(0)
          setQrIntent(null)
          onPaymentSuccess(status.payment_id, status.transaction || '')
        }

        if (status.status === 'failed') {
          handleError(
            status.error_message || 'Payment failed. Please try again.',
            true
          )
        }
      } catch (err) {
        console.error('Failed to poll Solana Pay status:', err)
      }
    },
    [clearTimers, handleError, onPaymentSuccess, solanaService]
  )

  const startCountdown = useCallback(
    (expiresAt: number, reference: string) => {
      const updateTime = () => {
        const remaining = Math.max(0, Math.floor(expiresAt - Date.now() / 1000))
        setTimeRemaining(remaining)

        if (remaining === 0) {
          handleError('Payment intent expired. Please generate a new QR code.')
        }
      }

      updateTime()

      countdownRef.current = setInterval(updateTime, 1000)
      pollRef.current = setInterval(() => void pollStatus(reference), 4000)
    },
    [handleError, pollStatus]
  )

  const fetchQrIntent = useCallback(async () => {
    if (!selectedToken) {
      setQrIntent(null)
      setQrDataUri(null)
      setError(null)
      clearTimers()
      setTimeRemaining(0)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      clearTimers()

      const intent = await solanaService.generateQRCode(
        priceId,
        selectedToken.symbol
      )
      setQrIntent(intent)
      setTimeRemaining(
        Math.max(0, Math.floor(intent.expires_at - Date.now() / 1000))
      )
      startCountdown(intent.expires_at, intent.reference)
      pollStatus(intent.reference)
    } catch (err) {
      console.error('Failed to generate Solana Pay QR intent:', err)
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to create Solana Pay QR code'
      handleError(message)
    } finally {
      setIsLoading(false)
    }
  }, [
    clearTimers,
    handleError,
    pollStatus,
    priceId,
    selectedToken,
    solanaService,
    startCountdown,
  ])

  useEffect(() => {
    void fetchQrIntent()
  }, [fetchQrIntent])

  useEffect(() => {
    const renderQr = async () => {
      if (!qrIntent) return
      try {
        const dataUri = await QRCode.toDataURL(qrIntent.url, {
          width: 320,
          margin: 1,
          color: {
            dark: '#0f1116',
            light: '#ffffff',
          },
        })
        setQrDataUri(dataUri)
      } catch (err) {
        console.error('Failed to render QR code:', err)
        handleError('Unable to render QR code')
      }
    }

    void renderQr()
  }, [qrIntent, handleError])

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
          onClick={() => fetchQrIntent()}
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

      {qrIntent && (
        <div className="payments-ui-countdown">
          Expires in {timeRemaining}s · {qrIntent.token_amount}{' '}
          {qrIntent.token_symbol}
        </div>
      )}
    </div>
  )
}
