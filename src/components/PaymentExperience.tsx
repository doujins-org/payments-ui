import React, { useCallback, useEffect, useState } from 'react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm, defaultCardDetailsFormTranslations } from './CardDetailsForm'
import type { CardDetailsFormTranslations } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import type { StoredPaymentMethodsTranslations } from './StoredPaymentMethods'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { usePaymentNotifications } from '../hooks/usePaymentNotifications'
import { SolanaPaymentView } from './SolanaPaymentView'

type AsyncStatus = 'idle' | 'processing' | 'success' | 'error'

export interface PaymentExperienceTranslations extends CardDetailsFormTranslations {
  useSavedCardTab?: string
  addNewCardTab?: string
  savedUnavailable?: string
  payWithSavedCard?: string
  processingSavedCard?: string
  savedErrorFallback?: string
  newCardUnavailable?: string
  payNow?: string
  storedLoadingCards?: string
  storedNoSavedMethods?: string
  storedSelectedLabel?: string
  storedUseCardLabel?: string
}

export const defaultPaymentExperienceTranslations: Required<PaymentExperienceTranslations> = {
  ...defaultCardDetailsFormTranslations,
  useSavedCardTab: 'Use saved card',
  addNewCardTab: 'Add new card',
  savedUnavailable: 'Saved payment methods are unavailable right now. Add a new card to get started.',
  payWithSavedCard: 'Pay with selected card',
  processingSavedCard: 'Processing...',
  savedErrorFallback: 'Unable to complete payment with saved card',
  newCardUnavailable: 'Select a subscription plan to add a new card.',
  payNow: 'Pay now',
  storedLoadingCards: 'Loading cards...',
  storedNoSavedMethods: 'No saved payment methods yet.',
  storedSelectedLabel: 'Selected',
  storedUseCardLabel: 'Use card',
}

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
  translations?: PaymentExperienceTranslations
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
  translations,
}) => {
  const t: Required<PaymentExperienceTranslations> = {
    ...defaultPaymentExperienceTranslations,
    ...translations,
  }
  const showNewCard = enableNewCard && Boolean(onNewCardPayment)
  const showStored = enableStoredMethods && Boolean(onSavedMethodPayment)
  const defaultTab = showStored ? 'saved' : 'new'
  const [activeTab, setActiveTab] = useState(defaultTab)
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
          : t.savedErrorFallback
      setSavedStatus('error')
      setSavedError(message as string)
      notifyStatus('error', { source: 'saved-payment' })
      notifyError(message as string)
    }
  }, [notifyError, notifyStatus, onSavedMethodPayment, selectedMethodId, t.savedErrorFallback, usdAmount])

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
          {t.savedUnavailable}
        </p>
      )
    }

    return (
      <div className="space-y-4">
        <StoredPaymentMethods
          selectedMethodId={selectedMethodId}
          onMethodSelect={handleMethodSelect}
          translations={{
            loadingCards: t.storedLoadingCards,
            noSavedMethods: t.storedNoSavedMethods,
            selectedLabel: t.storedSelectedLabel,
            useCardLabel: t.storedUseCardLabel,
          }}
        />

        <Button
          className="w-full"
          disabled={!selectedMethodId || savedStatus === 'processing'}
          onClick={handleSavedPayment}
        >
          {savedStatus === 'processing' ? t.processingSavedCard : t.payWithSavedCard}
        </Button>
        {savedError && <p className="text-sm text-destructive">{savedError}</p>}
      </div>
    )
  }

  const renderNewTab = () => {
    if (!showNewCard) {
      return (
        <p className="text-sm text-muted-foreground">
          {t.newCardUnavailable}
        </p>
      )
    }

    return (
      <CardDetailsForm
        visible
        submitLabel={t.payNow}
        externalError={newCardError}
        onTokenize={handleNewCardTokenize}
        submitting={newCardStatus === 'processing'}
        translations={t}
      />
    )
  }

  const renderCardExperience = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className='w-full rounded-md mb-4'>
        <TabsTrigger className='cursor-pointer' value="saved">
          {t.useSavedCardTab}
        </TabsTrigger>

        <TabsTrigger className='cursor-pointer' value="new">
          {t.addNewCardTab}
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
