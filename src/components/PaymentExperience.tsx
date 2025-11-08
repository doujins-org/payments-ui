import React from 'react'
import { CreditCard, Sparkles } from 'lucide-react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import { SolanaPaymentSelector } from './SolanaPaymentSelector'
import { usePaymentStore } from '../hooks/usePaymentStore'
import { usePaymentContext } from '../context/PaymentContext'

export interface PaymentExperienceProps {
  priceId: string
  usdAmount: number
  onNewCardPayment?: (payload: {
    token: string
    billing: BillingDetails
  }) => Promise<void> | void
  onSavedMethodPayment?: (payload: {
    paymentMethodId: string
    amount: number
  }) => Promise<void> | void
  enableNewCard?: boolean
  enableStoredMethods?: boolean
  enableSolanaPay?: boolean
  checkoutSummary?: React.ReactNode
  onSolanaSuccess?: (result: SubmitPaymentResponse | string) => void
  onSolanaError?: (error: string) => void
}

export const PaymentExperience: React.FC<PaymentExperienceProps> = ({
  priceId,
  usdAmount,
  onNewCardPayment,
  onSavedMethodPayment,
  enableNewCard = true,
  enableStoredMethods = true,
  enableSolanaPay = true,
  checkoutSummary,
  onSolanaSuccess,
  onSolanaError,
}) => {
  const { store } = usePaymentContext()
  const showNewCard = enableNewCard && Boolean(onNewCardPayment)
  const showStored = enableStoredMethods

  const selectedMethodId = usePaymentStore((state) => state.selectedMethodId)
  const setSelectedMethodId = usePaymentStore((state) => state.setSelectedMethod)
  const savedStatus = usePaymentStore((state) => state.savedPaymentStatus)
  const savedError = usePaymentStore((state) => state.savedPaymentError)
  const newCardStatus = usePaymentStore((state) => state.newCardStatus)
  const newCardError = usePaymentStore((state) => state.newCardError)
  const setSolanaModalOpen = usePaymentStore((state) => state.setSolanaModalOpen)
  const solanaModalOpen = usePaymentStore((state) => state.solanaModalOpen)

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethodId(method.id)
    store.getState().resetSavedPayment()
  }

  const handleNewCardTokenize = async (token: string, billing: BillingDetails) => {
    if (!onNewCardPayment) return
    try {
      store.getState().startNewCardPayment()
      await onNewCardPayment({ token, billing })
      store.getState().completeNewCardPayment()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete payment'
      store.getState().failNewCardPayment(message)
    }
  }

  const handleSavedPayment = async () => {
    if (!onSavedMethodPayment || !selectedMethodId) return
    try {
      store.getState().startSavedPayment()
      await onSavedMethodPayment({
        paymentMethodId: selectedMethodId,
        amount: usdAmount,
      })
      store.getState().completeSavedPayment()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to complete payment with saved card'
      store.getState().failSavedPayment(message)
    }
  }

  return (
    <div className="payments-ui-experience">
      <header className="payments-ui-experience-header">
        <div>
          <h2>
            <CreditCard className="payments-ui-icon" /> Secure checkout
          </h2>
          <p>Amount due: ${usdAmount.toFixed(2)}</p>
        </div>
        {checkoutSummary && <div className="payments-ui-summary">{checkoutSummary}</div>}
      </header>

      <div className="payments-ui-experience-grid">
        {showStored && (
          <div className="payments-ui-column">
            <StoredPaymentMethods
              selectedMethodId={selectedMethodId}
              onMethodSelect={handleMethodSelect}
              heading="Saved cards"
              description="Use or manage your saved payment methods."
            />
            {onSavedMethodPayment && (
              <button
                type="button"
                className="payments-ui-button"
                disabled={!selectedMethodId || savedStatus === 'processing'}
                onClick={handleSavedPayment}
              >
                {savedStatus === 'processing' ? 'Processing…' : 'Pay with selected card'}
              </button>
            )}
            {savedError && <p className="payments-ui-error">{savedError}</p>}
          </div>
        )}

        {showNewCard && (
          <div className="payments-ui-column">
            <div className="payments-ui-panel">
              <div className="payments-ui-panel-header">
                <div>
                  <p className="payments-ui-panel-title">
                    <CreditCard className="payments-ui-icon" /> Pay with a new card
                  </p>
                  <p className="payments-ui-panel-description">
                    Card details are tokenized via Collect.js and never hit your server.
                  </p>
                </div>
              </div>
              <CardDetailsForm
                visible
                submitLabel="Pay now"
                submitting={newCardStatus === 'processing'}
                externalError={newCardError}
                onTokenize={handleNewCardTokenize}
              />
            </div>
          </div>
        )}
      </div>

      {enableSolanaPay && (
        <div className="payments-ui-solana-banner">
          <div>
            <h3>
              <Sparkles className="payments-ui-icon" /> Prefer Solana Pay?
            </h3>
            <p>Use a Solana wallet or QR code for instant settlement.</p>
          </div>
          <button
            type="button"
            className="payments-ui-button"
            onClick={() => setSolanaModalOpen(true)}
          >
            Open Solana Pay
          </button>
        </div>
      )}

      {enableSolanaPay && (
        <SolanaPaymentSelector
          isOpen={solanaModalOpen}
          onClose={() => setSolanaModalOpen(false)}
          priceId={priceId}
          usdAmount={usdAmount}
          onSuccess={(result) => {
            setSolanaModalOpen(false)
            onSolanaSuccess?.(result)
          }}
          onError={onSolanaError}
        />
      )}
    </div>
  )
}
