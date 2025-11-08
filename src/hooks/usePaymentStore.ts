import { useStore } from 'zustand'
import { usePaymentContext } from '../context/PaymentContext'
import type { PaymentStoreState } from '../state/paymentStore'

export const usePaymentStore = <T>(selector: (state: PaymentStoreState) => T): T => {
  const { store } = usePaymentContext()
  return useStore(store, selector)
}
