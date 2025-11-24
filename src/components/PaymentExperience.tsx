import React, { useCallback, useState } from 'react'
import { CreditCard, Sparkles } from 'lucide-react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { usePaymentDialogs } from '../context/PaymentsDialogContext'

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
      await onSavedMethodPayment({
        paymentMethodId: selectedMethodId,
        amount: usdAmount,
      })
      setSavedStatus('success')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to complete payment with saved card'
      setSavedStatus('error')
      setSavedError(message)
    }
  }, [onSavedMethodPayment, selectedMethodId, usdAmount])

  const handleNewCardTokenize = useCallback(
    async (token: string, billing: BillingDetails) => {
      if (!onNewCardPayment) return
      try {
        setNewCardStatus('processing')
        setNewCardError(null)
        await onNewCardPayment({ token, billing })
        setNewCardStatus('success')
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to complete payment'
        setNewCardStatus('error')
        setNewCardError(message)
      }
    },
    [onNewCardPayment]
  )

  const openSolanaPay = useCallback(() => {
    if (!enableSolanaPay) return
    dialogs.solana.open({
      priceId,
      usdAmount,
      onSuccess: (result) => {
        onSolanaSuccess?.(result)
      },
      onError: onSolanaError,
    })
  }, [dialogs.solana, enableSolanaPay, onSolanaError, onSolanaSuccess, priceId, usdAmount])

  return (
    <div className="space-y-8">
      <Card className="border-border/60 bg-card/95">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              <CreditCard className="h-5 w-5 text-primary" /> Secure checkout
            </CardTitle>
            <CardDescription>Amount due: ${usdAmount.toFixed(2)}</CardDescription>
          </div>
          {checkoutSummary && <div>{checkoutSummary}</div>}
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 lg:grid-cols-2">
            {showStored && (
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
            )}

            {showNewCard && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-background/80 p-6">
                  <div className="mb-4 space-y-1">
                    <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <CreditCard className="h-4 w-4" /> Pay with a new card
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Card details are tokenized via Collect.js and never hit your server.
                    </p>
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
        </CardContent>
      </Card>

      {enableSolanaPay && (
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
      )}
    </div>
  )
}
