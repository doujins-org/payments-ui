import { useCallback } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import type {
  PaymentStatusPayload,
  PaymentSuccessPayload,
} from '../types/config'

export const usePaymentNotifications = () => {
  const { config } = usePaymentContext()

  const notifyStatus = useCallback(
    (status: PaymentStatusPayload['status'], context?: Record<string, unknown>) => {
      config.callbacks?.onStatusChange?.({ status, context })
    },
    [config.callbacks]
  )

  const notifySuccess = useCallback(
    (payload?: PaymentSuccessPayload) => {
      config.callbacks?.onSuccess?.(payload ?? {})
    },
    [config.callbacks]
  )

  const notifyError = useCallback(
    (error: string | Error) => {
      config.callbacks?.onError?.(
        typeof error === 'string' ? new Error(error) : error
      )
    },
    [config.callbacks]
  )

  return {
    notifyStatus,
    notifySuccess,
    notifyError,
  }
}
