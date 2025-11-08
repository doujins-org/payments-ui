import { createStore } from 'zustand/vanilla'
import type {
  PaymentCallbacks,
  PaymentStatusPayload,
  PaymentSuccessPayload,
} from '../types'

export type AsyncStatus = 'idle' | 'processing' | 'success' | 'error'
export type SolanaFlowState =
  | 'selecting'
  | 'processing'
  | 'confirming'
  | 'success'
  | 'error'

export interface PaymentStoreState {
  selectedMethodId: string | null
  solanaModalOpen: boolean
  savedPaymentStatus: AsyncStatus
  savedPaymentError: string | null
  newCardStatus: AsyncStatus
  newCardError: string | null
  solanaTab: 'wallet' | 'qr'
  solanaStatus: SolanaFlowState
  solanaError: string | null
  solanaTransactionId: string | null
  solanaSelectedToken: string | null
  solanaTokenAmount: number
  setSelectedMethod: (methodId: string | null) => void
  setSolanaModalOpen: (open: boolean) => void
  setSolanaTab: (tab: 'wallet' | 'qr') => void
  setSolanaSelectedToken: (symbol: string) => void
  setSolanaTokenAmount: (amount: number) => void
  setSolanaTransactionId: (txId: string | null) => void
  startSavedPayment: () => void
  completeSavedPayment: () => void
  failSavedPayment: (error: string) => void
  resetSavedPayment: () => void
  startNewCardPayment: () => void
  completeNewCardPayment: () => void
  failNewCardPayment: (error: string) => void
  resetNewCardPayment: () => void
  startSolanaPayment: () => void
  confirmSolanaPayment: () => void
  completeSolanaPayment: (payload?: PaymentSuccessPayload) => void
  failSolanaPayment: (error: string) => void
  resetSolanaPayment: () => void
  resetAll: () => void
}

const initialState = {
  selectedMethodId: null,
  solanaModalOpen: false,
  savedPaymentStatus: 'idle' as AsyncStatus,
  savedPaymentError: null,
  newCardStatus: 'idle' as AsyncStatus,
  newCardError: null,
  solanaTab: 'wallet' as const,
  solanaStatus: 'selecting' as SolanaFlowState,
  solanaError: null,
  solanaTransactionId: null,
  solanaSelectedToken: null,
  solanaTokenAmount: 0,
}

export interface PaymentStoreOptions {
  callbacks?: PaymentCallbacks
}

export const createPaymentStore = (options?: PaymentStoreOptions) =>
  createStore<PaymentStoreState>((set, get) => {
    const notifyStatus = (
      status: PaymentStatusPayload['status'],
      context?: Record<string, unknown>
    ) => {
      options?.callbacks?.onStatusChange?.({ status, context })
    }

    const notifySuccess = (payload?: PaymentSuccessPayload) => {
      if (!options?.callbacks?.onSuccess) return
      options.callbacks.onSuccess(payload ?? {})
    }

    const notifyError = (error: string) => {
      options?.callbacks?.onError?.(new Error(error))
    }

    return {
      ...initialState,
      setSelectedMethod: (methodId) =>
        set({ selectedMethodId: methodId }),
      setSolanaModalOpen: (open) =>
        set({ solanaModalOpen: open }),
      setSolanaTab: (tab) => set({ solanaTab: tab }),
      setSolanaSelectedToken: (symbol) =>
        set({ solanaSelectedToken: symbol }),
      setSolanaTokenAmount: (amount) => set({ solanaTokenAmount: amount }),
      setSolanaTransactionId: (txId) => set({ solanaTransactionId: txId }),
      startSavedPayment: () => {
        notifyStatus('processing', { source: 'saved-payment' })
        set({ savedPaymentStatus: 'processing', savedPaymentError: null })
      },
      completeSavedPayment: () => {
        notifyStatus('success', { source: 'saved-payment' })
        set({ savedPaymentStatus: 'success', savedPaymentError: null })
      },
      failSavedPayment: (error) => {
        notifyStatus('error', { source: 'saved-payment' })
        notifyError(error)
        set({ savedPaymentStatus: 'error', savedPaymentError: error })
      },
      resetSavedPayment: () =>
        set({ savedPaymentStatus: 'idle', savedPaymentError: null }),
      startNewCardPayment: () => {
        notifyStatus('processing', { source: 'new-card' })
        set({ newCardStatus: 'processing', newCardError: null })
      },
      completeNewCardPayment: () => {
        notifyStatus('success', { source: 'new-card' })
        set({ newCardStatus: 'success', newCardError: null })
      },
      failNewCardPayment: (error) => {
        notifyStatus('error', { source: 'new-card' })
        notifyError(error)
        set({ newCardStatus: 'error', newCardError: error })
      },
      resetNewCardPayment: () =>
        set({ newCardStatus: 'idle', newCardError: null }),
      startSolanaPayment: () => {
        notifyStatus('processing', { source: 'solana' })
        set({ solanaStatus: 'processing', solanaError: null })
      },
      confirmSolanaPayment: () =>
        set({ solanaStatus: 'confirming' }),
      completeSolanaPayment: (payload) => {
        notifyStatus('success', { source: 'solana' })
        notifySuccess(payload)
        set({ solanaStatus: 'success', solanaError: null })
      },
      failSolanaPayment: (error) => {
        notifyStatus('error', { source: 'solana' })
        notifyError(error)
        set({ solanaStatus: 'error', solanaError: error })
      },
      resetSolanaPayment: () =>
        set({
          solanaStatus: 'selecting',
          solanaError: null,
          solanaTransactionId: null,
        }),
      resetAll: () => set(initialState),
    }
  })
