import React, { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { usePaymentNotifications } from '../hooks/usePaymentNotifications'
import { SolanaPaymentView } from './SolanaPaymentView'
import { useAlternativePaymentProvider } from '../hooks/useAlternativePaymentProvider'
import { BillingAddressForm } from './BillingAddressForm'
import { AlternativePaymentDialog } from './AlternativePaymentDialog'

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
  enableAlternativePayments?: boolean
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
  enableAlternativePayments = true,
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
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null)
  const [alternativePaymentError, setAlternativePaymentError] = useState<string | null>(null)
  const { notifyStatus, notifySuccess, notifyError } = usePaymentNotifications()
	const {
		openFlexForm,
		isLoading: flexFormLoading,
		error: flexFormError,
		flexForm,
		closeFlexForm,
	} = useAlternativePaymentProvider()

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

  const handleAlternativePayment = useCallback(() => {
    if (!enableAlternativePayments || !priceId) {
      return
    }
    if (!billingDetails) {
      setAlternativePaymentError('Enter your billing details first.')
      return
    }
    const requiredFields: Array<keyof BillingDetails> = [
      'firstName',
      'lastName',
      'address1',
      'city',
      'stateRegion',
      'postalCode',
      'country',
    ]
    const missingField = requiredFields.find((field) => {
      const value = billingDetails[field]
      return typeof value !== 'string' || value.trim().length === 0
    })
    if (missingField) {
      setAlternativePaymentError('Please complete your billing address before continuing.')
      return
    }
    setAlternativePaymentError(null)
    openFlexForm({
      priceId,
      firstName: billingDetails.firstName,
      lastName: billingDetails.lastName,
      address1: billingDetails.address1,
      city: billingDetails.city,
      state: billingDetails.stateRegion ?? '',
      zipCode: billingDetails.postalCode,
      country: billingDetails.country,
    })
  }, [
    billingDetails,
    enableAlternativePayments,
    openFlexForm,
    priceId,
  ])

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
          heading="Saved cards"
          selectedMethodId={selectedMethodId}
          onMethodSelect={handleMethodSelect}
          description="Select one of your stored payment methods."
          showAddButton={false}
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
        onBillingChange={setBillingDetails}
      />
    )
  }

  const renderCardExperience = () => (
    <>
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
        <Button className="w-full" variant="secondary" onClick={showSolanaView}>
          <Sparkles className="mr-2 h-4 w-4" /> Pay with Solana
        </Button>
      )}
    </>
  )

	return (
		<>
			<div className="space-y-6 pt-4">
				{mode === 'cards' && renderCardExperience()}
				{mode === 'cards' && enableAlternativePayments && (
					<div className="space-y-4">
						<BillingAddressForm value={billingDetails} onChange={setBillingDetails} />
						<div className="space-y-2 text-center text-sm text-muted-foreground">
							<button
								type="button"
								className="text-primary underline-offset-4 hover:underline disabled:opacity-60"
								onClick={handleAlternativePayment}
								disabled={flexFormLoading || !priceId}
							>
								{flexFormLoading ? 'Preparing alternative checkout…' : 'Prefer a different processor? Pay with CCBill'}
							</button>
							{(alternativePaymentError || flexFormError) && (
								<p className="text-xs text-destructive">
									{alternativePaymentError || flexFormError}
								</p>
							)}
						</div>
					</div>
				)}
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
			<AlternativePaymentDialog form={flexForm} onClose={closeFlexForm} />
		</>
	)
}
