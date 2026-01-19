import React, { useCallback, useEffect, useState } from 'react'
import type { BillingDetails, PaymentMethod, SubmitPaymentResponse } from '../types'
import { CardDetailsForm, defaultCardDetailsFormTranslations } from './CardDetailsForm'
import type { CardDetailsFormTranslations } from './CardDetailsForm'
import { StoredPaymentMethods } from './StoredPaymentMethods'
import type { StoredPaymentMethodsTranslations } from './StoredPaymentMethods'
import { Button } from '../components/ui/button'
import { resolveErrorMessageByCode } from '../utils/errorMessages'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { usePaymentNotifications } from '../hooks/usePaymentNotifications'
import { SolanaPaymentView } from './SolanaPaymentView'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { defaultBillingDetails } from '../constants/billing'
import { countries } from '../data/countries'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

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
  payWithCcbill?: string
  processingCcbill?: string
  errors?: Record<string, string>
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
  payWithCcbill: 'Pay with CCBill',
  processingCcbill: 'Redirecting...',
  errors: {},
}

export interface PaymentExperienceProps {
  priceId: string
  usdAmount: number
  checkoutSessionId?: string
  walletId?: string
  onNewCardPayment?: (payload: {
    token: string
    billing: BillingDetails
  }) => Promise<void> | void
  onSavedMethodPayment?: (payload: {
    paymentMethodId: string
    amount: number
  }) => Promise<void> | void
  onCcbillPayment?: (payload: { billing: BillingDetails }) => Promise<void> | void
  enableNewCard?: boolean
  enableStoredMethods?: boolean
  enableSolanaPay?: boolean
  onSolanaSuccess?: (result: SubmitPaymentResponse | string) => void
  onSolanaError?: (error: string) => void
  initialMode?: 'cards' | 'solana'
  userEmail?: string | null
  translations?: PaymentExperienceTranslations
}

export const PaymentExperience: React.FC<PaymentExperienceProps> = ({
  priceId,
  usdAmount,
  checkoutSessionId,
  walletId,
  onNewCardPayment,
  onSavedMethodPayment,
  onCcbillPayment,
  enableNewCard = true,
  enableStoredMethods = true,
  enableSolanaPay = true,
  onSolanaSuccess,
  onSolanaError,
  initialMode = 'cards',
  userEmail,
  translations,
}) => {
  const t: Required<PaymentExperienceTranslations> = {
    ...defaultPaymentExperienceTranslations,
    ...translations,
  }
  const showNewCard = enableNewCard && Boolean(onNewCardPayment)
  const showStored = enableStoredMethods && Boolean(onSavedMethodPayment)
  const showCcbill = showNewCard && Boolean(onCcbillPayment)
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
  const [billingDetails, setBillingDetails] = useState<BillingDetails | null>(null)
  const [ccbillStatus, setCcbillStatus] = useState<AsyncStatus>('idle')
  const [ccbillError, setCcbillError] = useState<string | null>(null)
  const [ccbillModalOpen, setCcbillModalOpen] = useState(false)
  const [ccbillBilling, setCcbillBilling] = useState<BillingDetails>(() => {
    // Try to get default email from CardDetailsForm logic
    let defaultEmail = userEmail ?? ''
   
    return { ...defaultBillingDetails, email: defaultEmail }
  })
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

  useEffect(() => {
    if (!showNewCard) {
      setBillingDetails(null)
      setCcbillStatus('idle')
      setCcbillError(null)
      setCcbillModalOpen(false)
    }
  }, [showNewCard])

  const handleBillingChange = useCallback((billing: BillingDetails) => {
    setBillingDetails(billing)
    setCcbillError(null)
    setCcbillStatus('idle')
  }, [])

  const openCcbillModal = useCallback(() => {
    setCcbillError(null)
    setCcbillStatus('idle')
    setCcbillBilling((prev) => {
      let email = prev.email
      if (billingDetails && billingDetails.email) {
        email = billingDetails.email
      } else if (typeof window !== 'undefined') {
        try {
          const config = (window as any).paymentsUiConfig || {}
          if (config.defaultUser && config.defaultUser.email) {
            email = config.defaultUser.email
          }
        } catch {}
      }
      if (billingDetails) {
        return {
          ...billingDetails,
          email,
          provider: billingDetails.provider ?? prev.provider ?? defaultBillingDetails.provider,
        }
      }
      return { ...prev, email, provider: prev.provider ?? defaultBillingDetails.provider }
    })
    setCcbillModalOpen(true)
  }, [billingDetails])

  const handleCcbillFieldChange = useCallback(
    (field: keyof BillingDetails, value: string) => {
      setCcbillBilling((prev) => {
        const provider = prev.provider ?? billingDetails?.provider ?? defaultBillingDetails.provider
        return { ...prev, [field]: value, provider }
      })
    },
    [billingDetails]
  )

  const isBillingComplete = useCallback((billing: BillingDetails | null) => {
    if (!billing) return false
    return Boolean(
      billing.firstName.trim() &&
        billing.lastName.trim() &&
        billing.address1.trim() &&
        billing.city.trim() &&
        billing.postalCode.trim() &&
        billing.country.trim() &&
        billing.email.trim()
    )
  }, [])

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
      const message = resolveErrorMessageByCode(
        error,
        t.errors,
        t.savedErrorFallback
      )
      setSavedStatus('error')
      setSavedError(message)
      notifyStatus('error', { source: 'saved-payment' })
      notifyError(message)
    }
  }, [notifyError, notifyStatus, onSavedMethodPayment, selectedMethodId, t, usdAmount])

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
        const message = resolveErrorMessageByCode(
          error,
          t.errors,
          'Unable to complete payment'
        )
        setNewCardStatus('error')
        setNewCardError(message)
        notifyStatus('error', { source: 'new-card' })
        notifyError(message)
      }
    },
    [notifyError, notifyStatus, onNewCardPayment, t]
  )

  const handleCcbillPayment = useCallback(async () => {
    if (!onCcbillPayment) return

    if (!isBillingComplete(ccbillBilling)) {
      const message = t.errorRequiredFields
      setCcbillStatus('error')
      setCcbillError(message)
      notifyStatus('error', { source: 'ccbill' })
      notifyError(message)
      return
    }

    try {
      setCcbillStatus('processing')
      setCcbillError(null)
      notifyStatus('processing', { source: 'ccbill' })
      await onCcbillPayment({ billing: ccbillBilling })
      setCcbillStatus('success')
      setCcbillModalOpen(false)
      notifyStatus('success', { source: 'ccbill' })
    } catch (error) {
      const message = resolveErrorMessageByCode(
        error,
        t.errors,
        'Unable to start CCBill checkout'
      )
      setCcbillStatus('error')
      setCcbillError(message)
      notifyStatus('error', { source: 'ccbill' })
      notifyError(message)
    }
  }, [
    ccbillBilling,
    isBillingComplete,
    notifyError,
    notifyStatus,
    onCcbillPayment,
    t,
  ])

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

  const renderCcbillModal = () => (
    <Dialog
      open={ccbillModalOpen}
      onOpenChange={(open) => {
        setCcbillModalOpen(open)
        if (!open) {
          setCcbillStatus('idle')
          setCcbillError(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-lg" style={{ zIndex: 9999, border: 'none' }}>
        <DialogHeader>
          <DialogTitle>{t.payWithCcbill}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ccbill-first-name">{t.firstName}</Label>
              <Input
                id="ccbill-first-name"
                value={ccbillBilling.firstName}
                onChange={(e) => handleCcbillFieldChange('firstName', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ccbill-last-name">{t.lastName}</Label>
              <Input
                id="ccbill-last-name"
                value={ccbillBilling.lastName}
                onChange={(e) => handleCcbillFieldChange('lastName', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ccbill-email">{t.email}</Label>
            <Input
              id="ccbill-email"
              type="email"
              value={ccbillBilling.email}
              onChange={(e) => handleCcbillFieldChange('email', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ccbill-address">{t.address}</Label>
            <Input
              id="ccbill-address"
              value={ccbillBilling.address1}
              onChange={(e) => handleCcbillFieldChange('address1', e.target.value)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ccbill-city">{t.city}</Label>
              <Input
                id="ccbill-city"
                value={ccbillBilling.city}
                onChange={(e) => handleCcbillFieldChange('city', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ccbill-state">{t.state}</Label>
              <Input
                id="ccbill-state"
                value={ccbillBilling.stateRegion ?? ''}
                onChange={(e) => handleCcbillFieldChange('stateRegion', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ccbill-zip">{t.postalCode}</Label>
              <Input
                id="ccbill-zip"
                value={ccbillBilling.postalCode}
                onChange={(e) => handleCcbillFieldChange('postalCode', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ccbill-country">{t.country}</Label>
              <Select
                value={ccbillBilling.country}
                onValueChange={(value) => handleCcbillFieldChange('country', value)}
              >
                <SelectTrigger id="ccbill-country">
                  <SelectValue placeholder={t.selectCountry || 'Select a country'} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {ccbillError && <p className="text-sm text-destructive">{ccbillError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setCcbillModalOpen(false)}
              disabled={ccbillStatus === 'processing'}
            >
              {t.cancel}
            </Button>
            <Button
              className="min-w-[140px] bg-emerald-600 text-white hover:bg-emerald-500"
              type="button"
              disabled={ccbillStatus === 'processing'}
              onClick={handleCcbillPayment}
            >
              {ccbillStatus === 'processing' ? t.processingCcbill : t.payWithCcbill}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
        onBillingChange={handleBillingChange}
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

  const renderCcbillAction = () => {
    if (!showCcbill) return null

    return (
      <div className="space-y-2 border-t border-white/10 pt-4">
        <Button
          className="w-full"
          variant="outline"
          type="button"
          disabled={ccbillStatus === 'processing'}
          onClick={openCcbillModal}
        >
          {ccbillStatus === 'processing' ? t.processingCcbill : t.payWithCcbill}
        </Button>
        {renderCcbillModal()}
      </div>
    )
  }
 
  return (
    <div className="space-y-6 pt-4">
      {mode === 'cards' && (
        <>
          {renderCardExperience()}
          {renderCcbillAction()}
        </>
      )}
      {mode === 'solana' && enableSolanaPay && (
        <SolanaPaymentView
          priceId={priceId}
          usdAmount={usdAmount}
          checkoutSessionId={checkoutSessionId}
          walletId={walletId}
          onSuccess={handleSolanaSuccess}
          onError={handleSolanaError}
          onClose={exitSolanaView}
        />
      )}
    </div>
  )
}
