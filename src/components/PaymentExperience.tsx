import React, { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { usePaymentNotifications } from '../hooks/usePaymentNotifications'
import { SolanaPaymentView } from './SolanaPaymentView'

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
  initialMode?: 'cards' | 'solana'
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
  initialMode = 'cards',
}) => {
  const showNewCard = enableNewCard && Boolean(onNewCardPayment)
  const showStored = enableStoredMethods && Boolean(onSavedMethodPayment)
  const defaultTab = showStored ? 'saved' : 'new'
  const [activeTab, setActiveTab] = useState<'saved' | 'new'>(defaultTab)
  const [mode, setMode] = useState<'cards' | 'solana'>(() =>
    initialMode === 'solana' && enableSolanaPay ? 'solana' : 'cards'
  )
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [savedStatus, setSavedStatus] = useState<AsyncStatus>('idle')
  const [savedError, setSavedError] = useState<string | null>(null)
  const [newCardStatus, setNewCardStatus] = useState<AsyncStatus>('idle')
  const [newCardError, setNewCardError] = useState<string | null>(null)
  const { notifyStatus, notifyError } = usePaymentNotifications()

  useEffect(() => {
    setActiveTab(showStored ? 'saved' : 'new')
  }, [showStored])

  useEffect(() => {
    if (!enableSolanaPay) {
      setMode('cards')
      return
    }

    if (initialMode === 'solana') {
      setMode('solana')
    } else {
      setMode('cards')
    }
  }, [enableSolanaPay, initialMode])

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

  const showSolanaView = useCallback(() => {
    if (!enableSolanaPay) return
    setMode('solana')
  }, [enableSolanaPay])

  const exitSolanaView = useCallback(() => {
    setMode('cards')
  }, [])

  const handleSolanaSuccess = useCallback(
    (result: SubmitPaymentResponse | string) => {
      onSolanaSuccess?.(result)
      exitSolanaView()
    },
    [exitSolanaView, onSolanaSuccess]
  )

  const handleSolanaError = useCallback(
    (error: string) => {
      onSolanaError?.(error)
    },
    [onSolanaError]
  )

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
          showAddButton={false}
          selectedMethodId={selectedMethodId}
          onMethodSelect={handleMethodSelect}
        />

        <Button
          className="w-full"
          disabled={!selectedMethodId || savedStatus === 'processing'}
          onClick={handleSavedPayment}
        >
          {savedStatus === 'processing' ? 'Processing...' : 'Pay with selected card'}
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

  const renderCardExperience = () => (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'saved' | 'new')}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="saved" disabled={!showStored}>
          Use saved card
        </TabsTrigger>

        <TabsTrigger value="new" disabled={!showNewCard}>
          Add new card
        </TabsTrigger>
      </TabsList>

      <TabsContent value="saved">
        {renderSavedTab()}
      </TabsContent>
      <TabsContent value="new">
        {renderNewTab()}
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="space-y-6 pt-4">
      {mode === 'cards' && renderCardExperience()}
      {mode === 'solana' && enableSolanaPay && (
        <SolanaPaymentView
          priceId={priceId}
          usdAmount={usdAmount}
          onSuccess={handleSolanaSuccess}
          onError={handleSolanaError}
          onClose={exitSolanaView}
        />
      )}
    </div>
  )
}
