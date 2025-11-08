import { useState, useEffect, useCallback, useRef } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { TransactionStatus, PaymentStatusResponse } from '../types'
import { usePaymentContext } from '../context/PaymentContext'

interface PaymentStatusHookOptions {
  transactionId?: string
  purchaseId?: string
  onConfirmed?: () => void
  onFailed?: (error: string) => void
  maxRetries?: number
  retryInterval?: number // milliseconds
}

export const usePaymentStatus = (options: PaymentStatusHookOptions = {}) => {
  const { connection } = useConnection()
  const { services } = usePaymentContext()
  const billingApi = services.billingApi
  const {
    transactionId,
    purchaseId,
    onConfirmed,
    onFailed,
    maxRetries = 30, // 5 minutes with 10s intervals
    retryInterval = 10000, // 10 seconds
  } = options

  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMonitoringRef = useRef(false)

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Check transaction status on Solana blockchain
  const checkTransactionStatus = useCallback(
    async (signature: string): Promise<TransactionStatus> => {
      try {
        const statusResponse = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        })

        if (statusResponse.value === null) {
          return {
            signature,
            confirmationStatus: 'processed',
            confirmations: 0,
            error: 'Transaction not found',
          }
        }

        const { confirmationStatus, confirmations, slot, err } =
          statusResponse.value

        // Get block time if we have a slot
        let blockTime: number | undefined
        if (slot) {
          try {
            blockTime = (await connection.getBlockTime(slot)) || undefined
          } catch (error) {
            // Block time not available
          }
        }

        return {
          signature,
          confirmationStatus: err
            ? 'failed'
            : confirmationStatus || 'processed',
          confirmations: confirmations || 0,
          slot,
          blockTime,
          error: err ? `Transaction failed: ${err}` : undefined,
        }
      } catch (error) {
        console.error('Failed to check transaction status:', error)
        return {
          signature,
          confirmationStatus: 'failed',
          confirmations: 0,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to check transaction status',
        }
      }
    },
    [connection]
  )

  // Check payment status from backend
  const checkPaymentStatus = useCallback(
    async (id: string): Promise<PaymentStatusResponse | null> => {
      try {
        const data = await billingApi.get<PaymentStatusResponse>(
          `/payment/status/${id}`
        )
        return data
      } catch (error: any) {
        if (error?.status === 404) {
          return null // Payment not found
        }
        console.error('Failed to check payment status:', error)
        return null
      }
    },
    [billingApi]
  )

  // Monitor transaction until confirmed or failed
  const startMonitoring = useCallback(async () => {
    if (isMonitoringRef.current || (!transactionId && !purchaseId)) {
      return
    }

    isMonitoringRef.current = true
    setIsLoading(true)
    setError(null)
    setRetryCount(0)

    const monitor = async () => {
      try {
        let currentStatus: TransactionStatus | null = null
        let currentPaymentStatus: PaymentStatusResponse | null = null

        // Check blockchain status if we have a transaction ID
        if (transactionId) {
          currentStatus = await checkTransactionStatus(transactionId)
          setStatus(currentStatus)
        }

        // Check backend payment status if we have a purchase ID
        if (purchaseId) {
          currentPaymentStatus = await checkPaymentStatus(purchaseId)
          setPaymentStatus(currentPaymentStatus)
        }

        // Determine if we should stop monitoring
        const isBlockchainConfirmed =
          currentStatus?.confirmationStatus === 'finalized' ||
          currentStatus?.confirmationStatus === 'confirmed'
        const isBackendConfirmed = currentPaymentStatus?.status === 'confirmed'
        const isBlockchainFailed =
          currentStatus?.confirmationStatus === 'failed' || currentStatus?.error
        const isBackendFailed = currentPaymentStatus?.status === 'failed'

        if (isBlockchainConfirmed || isBackendConfirmed) {
          // Payment confirmed
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          isMonitoringRef.current = false
          setIsLoading(false)
          onConfirmed?.()
          return
        }

        if (isBlockchainFailed || isBackendFailed) {
          // Payment failed
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          isMonitoringRef.current = false
          setIsLoading(false)
          const errorMessage = currentStatus?.error || 'Payment failed'
          setError(errorMessage)
          onFailed?.(errorMessage)
          return
        }

        // Continue monitoring
        setRetryCount((prev) => prev + 1)

        if (retryCount >= maxRetries) {
          // Max retries reached
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          isMonitoringRef.current = false
          setIsLoading(false)
          const timeoutError =
            'Payment confirmation timeout - please check your transaction manually'
          setError(timeoutError)
          onFailed?.(timeoutError)
          return
        }
      } catch (error) {
        console.error('Error monitoring payment:', error)
        setRetryCount((prev) => prev + 1)

        if (retryCount >= maxRetries) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          isMonitoringRef.current = false
          setIsLoading(false)
          const monitorError = 'Failed to monitor payment status'
          setError(monitorError)
          onFailed?.(monitorError)
        }
      }
    }

    // Start monitoring immediately
    await monitor()

    // Continue monitoring at intervals
    intervalRef.current = setInterval(monitor, retryInterval)
  }, [
    transactionId,
    purchaseId,
    checkTransactionStatus,
    checkPaymentStatus,
    onConfirmed,
    onFailed,
    maxRetries,
    retryInterval,
    retryCount,
  ])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    isMonitoringRef.current = false
    setIsLoading(false)
  }, [])

  // Manual status check
  const checkStatus = useCallback(async () => {
    if (!transactionId && !purchaseId) return

    setIsLoading(true)
    setError(null)

    try {
      if (transactionId) {
        const txStatus = await checkTransactionStatus(transactionId)
        setStatus(txStatus)
      }

      if (purchaseId) {
        const payStatus = await checkPaymentStatus(purchaseId)
        setPaymentStatus(payStatus)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to check status'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [transactionId, purchaseId, checkTransactionStatus, checkPaymentStatus])

  // Auto-start monitoring when transaction/purchase ID is provided
  useEffect(() => {
    if ((transactionId || purchaseId) && !isMonitoringRef.current) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [transactionId, purchaseId, startMonitoring, stopMonitoring])

  // Get current confirmation status
  const getConfirmationStatus = useCallback(() => {
    if (paymentStatus?.status === 'confirmed') return 'confirmed'
    if (paymentStatus?.status === 'failed') return 'failed'
    if (status?.confirmationStatus === 'finalized') return 'confirmed'
    if (status?.confirmationStatus === 'confirmed') return 'confirmed'
    if (status?.confirmationStatus === 'failed' || status?.error)
      return 'failed'
    return 'pending'
  }, [status, paymentStatus])

  // Get Solscan URL for transaction
  const getSolscanUrl = useCallback(
    (signature?: string) => {
      const txId = signature || transactionId
      if (!txId) return null
      return `https://solscan.io/tx/${txId}`
    },
    [transactionId]
  )

  return {
    status,
    paymentStatus,
    isLoading,
    error,
    retryCount,
    maxRetries,
    isMonitoring: isMonitoringRef.current,
    confirmationStatus: getConfirmationStatus(),
    startMonitoring,
    stopMonitoring,
    checkStatus,
    getSolscanUrl,
    isConfirmed: getConfirmationStatus() === 'confirmed',
    isFailed: getConfirmationStatus() === 'failed',
    isPending: getConfirmationStatus() === 'pending',
  }
}
