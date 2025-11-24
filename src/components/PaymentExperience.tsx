import React, { useCallback, useState } from 'react'
import { CreditCard, Sparkles } from 'lucide-react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { usePaymentDialogs } from '../context/PaymentsDialogContext'
import { usePaymentNotifications } from '../hooks/usePaymentNotifications'

type AsyncStatus = 'idle' | 'processing' | 'success' | 'error'

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
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [savedStatus, setSavedStatus] = useState<AsyncStatus>('idle')
  const [savedError, setSavedError] = useState<string | null>(null)
  const [newCardStatus, setNewCardStatus] = useState<AsyncStatus>('idle')
  const [newCardError, setNewCardError] = useState<string | null>(null)
  const dialogs = usePaymentDialogs()
  const { notifyStatus, notifySuccess, notifyError } = usePaymentNotifications()

  const handleMethodSelect = useCallback((method: PaymentMethod) => {
    setSelectedMethodId(method.id)
    setSavedStatus('idle')
    setSavedError(null)
  }, [])

  const handleSavedPayment = useCallback(async () => {
    if (!onSavedMethodPayment || !selectedMethodId) return
    try {
      setSavedStatus('processing')
      setSavedError(null)
      notifyStatus('processing', { source: 'saved-payment' })
      await onSavedMethodPayment({
        paymentMethodId: selectedMethodId,
        amount: usdAmount,
      })
      setSavedStatus('success')
      notifyStatus('success', { source: 'saved-payment' })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to complete payment with saved card'
      setSavedStatus('error')
      setSavedError(message)
      notifyStatus('error', { source: 'saved-payment' })
      notifyError(message)
    }
  }, [notifyError, notifyStatus, onSavedMethodPayment, selectedMethodId, usdAmount])

  const handleNewCardTokenize = useCallback(
    async (token: string, billing: BillingDetails) => {
      if (!onNewCardPayment) return
      try {
        setNewCardStatus('processing')
        setNewCardError(null)
        notifyStatus('processing', { source: 'new-card' })
        await onNewCardPayment({ token, billing })
        setNewCardStatus('success')
        notifyStatus('success', { source: 'new-card' })
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to complete payment'
        setNewCardStatus('error')
        setNewCardError(message)
        notifyStatus('error', { source: 'new-card' })
        notifyError(message)
      }
    },
    [notifyError, notifyStatus, onNewCardPayment]
  )

  const openSolanaPay = useCallback(() => {
    if (!enableSolanaPay) return
    dialogs.solana.open({
      priceId,
      usdAmount,
      onSuccess: (result) => {
        onSolanaSuccess?.(result)
      },
      onError: (error) => {
        onSolanaError?.(error)
      },
    })
  }, [dialogs.solana, enableSolanaPay, onSolanaError, onSolanaSuccess, priceId, usdAmount])

  return (
    <div className="space-y-8">

      <div>
        {/* {showStored && (
              <div className="space-y-4">
                <StoredPaymentMethods
                  selectedMethodId={selectedMethodId}
                  onMethodSelect={handleMethodSelect}
                  heading="Saved cards"
                  description="Use or manage your saved payment methods."
                />
                {onSavedMethodPayment && (
                  <Button
                    className="w-full"
                    disabled={!selectedMethodId || savedStatus === 'processing'}
                    onClick={handleSavedPayment}
                  >
                    {savedStatus === 'processing'
                      ? 'Processing…'
                      : 'Pay with selected card'}
                  </Button>
                )}
                {savedError && (
                  <p className="text-sm text-destructive">{savedError}</p>
                )}
              </div>
            )} */}

        {showNewCard && (
          <div className="space-y-4">
            <CardDetailsForm
              visible
              submitLabel="Pay now"
              externalError={newCardError}
              onTokenize={handleNewCardTokenize}
              submitting={newCardStatus === 'processing'}
            />
          </div>
        )}
      </div>

      {/* {enableSolanaPay && (
        <Card className="border border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-4 text-sm text-primary md:flex-row md:items-center md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-base font-semibold text-primary">
                <Sparkles className="h-4 w-4" /> Prefer Solana Pay?
              </p>

              <p className="text-sm text-primary/80">
                Use a Solana wallet or QR code for instant settlement.
              </p>
            </div>
            <Button onClick={openSolanaPay}>Open Solana Pay</Button>
          </CardContent>
        </Card>
      )} */}
    </div>
  )
}
