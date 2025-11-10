import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { TokenInfo, SubmitPaymentResponse } from '../types'
import type {
  SolanaPayQRCodeIntent,
  SolanaPayStatusResponse,
} from '../types/solana-pay'
import { useSolanaService } from './useSolanaService'

interface UseSolanaQrPaymentOptions {
  priceId: string
  selectedToken: TokenInfo | null
  onSuccess: (result: SubmitPaymentResponse | string, txId: string) => void
  onError: (error: string) => void
}

interface UseSolanaQrPaymentState {
  intent: SolanaPayQRCodeIntent | null
  qrDataUri: string | null
  isLoading: boolean
  error: string | null
  timeRemaining: number
  refresh: () => void
}

export const useSolanaQrPayment = (
  options: UseSolanaQrPaymentOptions
): UseSolanaQrPaymentState => {
  const { priceId, selectedToken, onSuccess, onError } = options
  const solanaService = useSolanaService()

  const [intent, setIntent] = useState<SolanaPayQRCodeIntent | null>(null)
  const [qrDataUri, setQrDataUri] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)

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

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  const handleError = useCallback(
    (message: string, notifyParent = false) => {
      clearTimers()
      setError(message)
      setIntent(null)
      setQrDataUri(null)
      setTimeRemaining(0)
      if (notifyParent) {
        onError(message)
      }
    },
    [clearTimers, onError]
  )

  const handleSuccess = useCallback(
    (status: SolanaPayStatusResponse) => {
      clearTimers()
      setTimeRemaining(0)
      setIntent(null)
      onSuccess(status.payment_id, status.transaction || '')
    },
    [clearTimers, onSuccess]
  )

  const pollStatus = useCallback(
    async (reference: string) => {
      try {
        const status = await solanaService.checkPaymentStatus(reference)

        if (status.status === 'confirmed') {
          handleSuccess(status)
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
    [handleError, handleSuccess, solanaService]
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

  const renderQr = useCallback(async (qrIntent: SolanaPayQRCodeIntent) => {
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
  }, [handleError])

  const fetchIntent = useCallback(async () => {
    if (!selectedToken) {
      setIntent(null)
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

      const nextIntent = await solanaService.generateQRCode(
        priceId,
        selectedToken.symbol
      )
      setIntent(nextIntent)
      setTimeRemaining(
        Math.max(0, Math.floor(nextIntent.expires_at - Date.now() / 1000))
      )
      await renderQr(nextIntent)
      startCountdown(nextIntent.expires_at, nextIntent.reference)
      pollStatus(nextIntent.reference)
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
    renderQr,
  ])

  useEffect(() => {
    void fetchIntent()
  }, [fetchIntent])

  return {
    intent,
    qrDataUri,
    isLoading,
    error,
    timeRemaining,
    refresh: fetchIntent,
  }
}
