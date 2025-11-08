import { createStore } from 'zustand/vanilla'

export type AsyncStatus = 'idle' | 'processing' | 'success' | 'error'

export interface PaymentStoreState {
  selectedMethodId: string | null
  solanaModalOpen: boolean
  savedPaymentStatus: AsyncStatus
  savedPaymentError: string | null
  newCardStatus: AsyncStatus
  newCardError: string | null
  setSelectedMethod: (methodId: string | null) => void
  setSolanaModalOpen: (open: boolean) => void
  startSavedPayment: () => void
  completeSavedPayment: () => void
  failSavedPayment: (error: string) => void
  resetSavedPayment: () => void
  startNewCardPayment: () => void
  completeNewCardPayment: () => void
  failNewCardPayment: (error: string) => void
  resetNewCardPayment: () => void
  resetAll: () => void
}

const initialState = {
  selectedMethodId: null,
  solanaModalOpen: false,
  savedPaymentStatus: 'idle' as AsyncStatus,
  savedPaymentError: null,
  newCardStatus: 'idle' as AsyncStatus,
  newCardError: null,
}

export const createPaymentStore = () =>
  createStore<PaymentStoreState>((set) => ({
    ...initialState,
    setSelectedMethod: (methodId) => set({ selectedMethodId: methodId }),
    setSolanaModalOpen: (open) => set({ solanaModalOpen: open }),
    startSavedPayment: () =>
      set({ savedPaymentStatus: 'processing', savedPaymentError: null }),
    completeSavedPayment: () =>
      set({ savedPaymentStatus: 'success', savedPaymentError: null }),
    failSavedPayment: (error) =>
      set({ savedPaymentStatus: 'error', savedPaymentError: error }),
    resetSavedPayment: () =>
      set({ savedPaymentStatus: 'idle', savedPaymentError: null }),
    startNewCardPayment: () =>
      set({ newCardStatus: 'processing', newCardError: null }),
    completeNewCardPayment: () =>
      set({ newCardStatus: 'success', newCardError: null }),
    failNewCardPayment: (error) =>
      set({ newCardStatus: 'error', newCardError: error }),
    resetNewCardPayment: () =>
      set({ newCardStatus: 'idle', newCardError: null }),
    resetAll: () => set(initialState),
  }))
