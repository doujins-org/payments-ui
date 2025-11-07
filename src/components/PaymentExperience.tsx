import React, { useState } from 'react'
import { CreditCard, Sparkles } from 'lucide-react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import { SolanaPaymentSelector } from './SolanaPaymentSelector'

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
  const showNewCard = enableNewCard && Boolean(onNewCardPayment)
  const showStored = enableStoredMethods

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [isPayingSaved, setIsPayingSaved] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)
  const [newCardError, setNewCardError] = useState<string | null>(null)
  const [isProcessingNewCard, setIsProcessingNewCard] = useState(false)
  const [isSolanaOpen, setIsSolanaOpen] = useState(false)

  const handleNewCardTokenize = async (token: string, billing: BillingDetails) => {
    if (!onNewCardPayment) return
    try {
      setNewCardError(null)
      setIsProcessingNewCard(true)
      await onNewCardPayment({ token, billing })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete payment'
      setNewCardError(message)
    } finally {
      setIsProcessingNewCard(false)
    }
  }

  const handleSavedPayment = async () => {
    if (!onSavedMethodPayment || !selectedMethod) return
    try {
      setSavedError(null)
      setIsPayingSaved(true)
      await onSavedMethodPayment({
        paymentMethodId: selectedMethod.id,
        amount: usdAmount,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete payment with saved card'
      setSavedError(message)
    } finally {
      setIsPayingSaved(false)
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
              selectedMethodId={selectedMethod?.id}
              onMethodSelect={setSelectedMethod}
              heading="Saved cards"
              description="Use or manage your saved payment methods."
            />
            {onSavedMethodPayment && (
              <button
                type="button"
                className="payments-ui-button"
                disabled={!selectedMethod || isPayingSaved}
                onClick={handleSavedPayment}
              >
                {isPayingSaved ? 'Processing…' : 'Pay with selected card'}
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
                submitting={isProcessingNewCard}
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
            onClick={() => setIsSolanaOpen(true)}
          >
            Open Solana Pay
          </button>
        </div>
      )}

      {enableSolanaPay && (
        <SolanaPaymentSelector
          isOpen={isSolanaOpen}
          onClose={() => setIsSolanaOpen(false)}
          priceId={priceId}
          usdAmount={usdAmount}
          onSuccess={(result) => {
            setIsSolanaOpen(false)
            onSolanaSuccess?.(result)
          }}
          onError={onSolanaError}
        />
      )}
    </div>
  )
}
