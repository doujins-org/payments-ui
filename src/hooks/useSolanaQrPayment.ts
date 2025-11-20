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
  const tokenSymbol = selectedToken?.symbol ?? null
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  const [intent, setIntent] = useState<SolanaPayQRCodeIntent | null>(null)
  const [qrDataUri, setQrDataUri] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [refreshNonce, setRefreshNonce] = useState(0)

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

  const resetState = useCallback(
    (message?: string | null) => {
      clearTimers()
      setIntent((prev) => (prev ? null : prev))
      setQrDataUri((prev) => (prev ? null : prev))
      setTimeRemaining((prev) => (prev !== 0 ? 0 : prev))
      setError((prev) => {
        const next = message === undefined ? null : message
        return prev === next ? prev : next
      })
    },
    [clearTimers]
  )

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const handleError = useCallback(
    (message: string, notifyParent = false) => {
      console.error('[payments-ui] Solana Pay QR error:', message)
      clearTimers()
      resetState(message)
      if (notifyParent) {
        onErrorRef.current?.(message)
      }
    },
    [clearTimers, resetState]
  )

  const handleSuccess = useCallback(
    (status: SolanaPayStatusResponse) => {
      clearTimers()
      resetState(null)
      console.log('[payments-ui] Solana Pay QR confirmed', {
        paymentId: status.payment_id,
        intentId: status.intent_id,
      })
      onSuccessRef.current?.(status.payment_id, status.transaction || '')
    },
    [clearTimers, resetState]
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

  useEffect(() => {
    let cancelled = false

    const generateIntent = async () => {
      clearTimers()

      if (!tokenSymbol || !priceId) {
        resetState(null)
        setIsLoading((prev) => (prev ? false : prev))
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        console.log('[payments-ui] Requesting Solana Pay QR intent', {
          priceId,
          token: tokenSymbol,
        })
        const nextIntent = await solanaService.generateQRCode(
          priceId,
          tokenSymbol
        )
        if (cancelled) return
        setIntent(nextIntent)
        setTimeRemaining(
          Math.max(0, Math.floor(nextIntent.expires_at - Date.now() / 1000))
        )
        await renderQr(nextIntent)
        console.log('[payments-ui] Solana Pay QR ready', {
          reference: nextIntent.reference,
        })
        startCountdown(nextIntent.expires_at, nextIntent.reference)
        pollStatus(nextIntent.reference)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to generate Solana Pay QR intent:', err)
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to create Solana Pay QR code'
        handleError(message)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void generateIntent()

    return () => {
      cancelled = true
      clearTimers()
    }
  }, [
    clearTimers,
    handleError,
    pollStatus,
    priceId,
    renderQr,
    resetState,
    solanaService,
    startCountdown,
    tokenSymbol,
    refreshNonce,
  ])

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1)
  }, [])

  return {
    intent,
    qrDataUri,
    isLoading,
    error,
    timeRemaining,
    refresh,
  }
}
