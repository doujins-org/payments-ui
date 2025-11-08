import type { PaymentStoreState } from './paymentStore'

export const selectCheckoutFlow = (state: PaymentStoreState) => ({
  selectedMethodId: state.selectedMethodId,
  savedStatus: state.savedPaymentStatus,
  savedError: state.savedPaymentError,
  newCardStatus: state.newCardStatus,
  newCardError: state.newCardError,
  solanaModalOpen: state.solanaModalOpen,
  setSelectedMethod: state.setSelectedMethod,
  setSolanaModalOpen: state.setSolanaModalOpen,
  startSavedPayment: state.startSavedPayment,
  completeSavedPayment: state.completeSavedPayment,
  failSavedPayment: state.failSavedPayment,
  startNewCardPayment: state.startNewCardPayment,
  completeNewCardPayment: state.completeNewCardPayment,
  failNewCardPayment: state.failNewCardPayment,
  resetSavedPayment: state.resetSavedPayment,
})

export const selectSolanaFlow = (state: PaymentStoreState) => ({
  tab: state.solanaTab,
  status: state.solanaStatus,
  error: state.solanaError,
  transactionId: state.solanaTransactionId,
  tokenAmount: state.solanaTokenAmount,
  selectedTokenSymbol: state.solanaSelectedToken,
  setTab: state.setSolanaTab,
  setTokenAmount: state.setSolanaTokenAmount,
  setTransactionId: state.setSolanaTransactionId,
  setSelectedTokenSymbol: state.setSolanaSelectedToken,
  startSolanaPayment: state.startSolanaPayment,
  confirmSolanaPayment: state.confirmSolanaPayment,
  completeSolanaPayment: state.completeSolanaPayment,
  failSolanaPayment: state.failSolanaPayment,
  resetSolanaPayment: state.resetSolanaPayment,
})
