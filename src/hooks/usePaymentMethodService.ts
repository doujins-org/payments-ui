import { useMemo } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import type { PaymentMethodService } from '../services/PaymentMethodService'

export const usePaymentMethodService = (): PaymentMethodService => {
  const { services } = usePaymentContext()
  return useMemo(() => services.paymentMethods, [services])
}
