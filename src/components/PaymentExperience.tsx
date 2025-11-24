import React, { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
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
  onSolanaSuccess,
  onSolanaError,
}) => {
  const showNewCard = enableNewCard && Boolean(onNewCardPayment)
  const showStored = enableStoredMethods && Boolean(onSavedMethodPayment)
  const defaultTab = showStored ? 'saved' : 'new'
  const [activeTab, setActiveTab] = useState<'saved' | 'new'>(defaultTab)
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [savedStatus, setSavedStatus] = useState<AsyncStatus>('idle')
  const [savedError, setSavedError] = useState<string | null>(null)
  const [newCardStatus, setNewCardStatus] = useState<AsyncStatus>('idle')
  const [newCardError, setNewCardError] = useState<string | null>(null)
  const dialogs = usePaymentDialogs()
  const { notifyStatus, notifySuccess, notifyError } = usePaymentNotifications()

  useEffect(() => {
    setActiveTab(showStored ? 'saved' : 'new')
  }, [showStored])

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

  const renderSavedTab = () => {
    if (!showStored) {
      return (
        <p className="text-sm text-muted-foreground">
          Saved payment methods are unavailable right now. Add a new card to get started.
        </p>
      )
    }

    return (
      <div className="space-y-4">
        <StoredPaymentMethods
          selectedMethodId={selectedMethodId}
          onMethodSelect={handleMethodSelect}
          heading="Saved cards"
          description="Select one of your stored payment methods."
        />
        <Button
          className="w-full"
          disabled={!selectedMethodId || savedStatus === 'processing'}
          onClick={handleSavedPayment}
        >
          {savedStatus === 'processing' ? 'Processing…' : 'Pay with selected card'}
        </Button>
        {savedError && <p className="text-sm text-destructive">{savedError}</p>}
      </div>
    )
  }

  const renderNewTab = () => {
    if (!showNewCard) {
      return (
        <p className="text-sm text-muted-foreground">
          Select a subscription plan to add a new card.
        </p>
      )
    }

    return (
      <CardDetailsForm
        visible
        submitLabel="Pay now"
        externalError={newCardError}
        onTokenize={handleNewCardTokenize}
        submitting={newCardStatus === 'processing'}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'saved' | 'new')}
        className="space-y-3"
      >
        <TabsList className="grid w-full grid-cols-2 border border-border/60">
          <TabsTrigger value="saved" disabled={!showStored}>
            Use saved card
          </TabsTrigger>
          <TabsTrigger value="new" disabled={!showNewCard}>
            Add new card
          </TabsTrigger>
        </TabsList>
        <TabsContent value="saved" className="space-y-4">
          {renderSavedTab()}
        </TabsContent>
        <TabsContent value="new" className="space-y-4">
          {renderNewTab()}
        </TabsContent>
      </Tabs>

      {enableSolanaPay && (
        <Button className="w-full" variant="secondary" onClick={openSolanaPay}>
          <Sparkles className="mr-2 h-4 w-4" /> Pay with Solana
        </Button>
      )}
    </div>
  )
}
