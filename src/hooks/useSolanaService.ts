import { useMemo } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import type { SolanaPaymentService } from '../services/SolanaPaymentService'

export const useSolanaService = (): SolanaPaymentService => {
  const { services } = usePaymentContext()
  return useMemo(() => services.solanaPayments, [services])
}
