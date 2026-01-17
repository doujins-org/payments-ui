import React, { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { AlertCircle } from 'lucide-react'
import { PaymentExperience, defaultPaymentExperienceTranslations } from '../PaymentExperience'
import { SubscriptionSuccessDialog } from './SubscriptionSuccessDialog'
import { useSubscriptionActions } from '../../hooks/useSubscriptionActions'
import type { BillingDetails, CheckoutResponse, SubmitPaymentResponse } from '../../types'
import type { PaymentExperienceTranslations } from '../PaymentExperience'


export interface SubscriptionCheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  priceId?: string | null
  usdAmount?: number
  planName?: string
  amountLabel?: string
  billingPeriodLabel?: string
  userEmail?: string | null
  provider?: string
  onSuccess?: () => void
  enableSolanaPay?: boolean
  onSolanaSuccess?: (result: SubmitPaymentResponse | string) => void
  onSolanaError?: (error: string) => void
  initialMode?: 'cards' | 'solana'
  translations?: SubscriptionCheckoutModalTranslations
}

export interface SubscriptionCheckoutModalTranslations extends PaymentExperienceTranslations {
  title?: string
  selectPlanMessage?: string
}

const defaultTranslations: Required<SubscriptionCheckoutModalTranslations> = {
  ...defaultPaymentExperienceTranslations,
  title: 'Checkout',
  selectPlanMessage: 'Select a subscription plan to continue.',
}

export const SubscriptionCheckoutModal: React.FC<SubscriptionCheckoutModalProps> = ({
  open,
  onOpenChange,
  priceId,
  usdAmount = 0,
  planName,
  amountLabel,
  billingPeriodLabel,
  userEmail,
  provider = 'mobius',
  onSuccess,
  enableSolanaPay = true,
  onSolanaSuccess,
  onSolanaError,
  initialMode = 'cards',
  translations,
}) => {
  const [showSuccess, setShowSuccess] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const { subscribeWithCard, subscribeWithSavedMethod, subscribeWithCCBill } = useSubscriptionActions()
  const t: Required<SubscriptionCheckoutModalTranslations> = {
    ...defaultTranslations,
    ...translations,
  }

  // Generate a new idempotency key when the modal opens or priceId changes
  // This ensures retries use the same key, but new checkout attempts get fresh keys
  useEffect(() => {
    if (open) {
      setIdempotencyKey(crypto.randomUUID())
    }
  }, [open, priceId])

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen)
      if (!nextOpen) setShowSuccess(false)
    },
    [onOpenChange]
  )

  const ensurePrice = () => {
    if (!priceId) throw new Error('Select a plan before subscribing.')
    return priceId
  }

  const notifySuccess = (result?: SubmitPaymentResponse | string) => {
    setShowSuccess(true)
    onSuccess?.()
    if (result && typeof window !== 'undefined') {
      console.debug('[payments-ui] subscription success', result)
    }
  }

  const handleCheckoutResponse = (response: CheckoutResponse) => {
    if (response.status === 'blocked') {
      throw new Error(response.message || 'This subscription cannot be completed right now.')
    }

    const nextAction = response.next_action
    if (nextAction?.type === 'redirect_to_url') {
      const redirectUrl = nextAction.redirect_to_url?.url || response.payment?.redirect_url
      if (!redirectUrl) {
        throw new Error(response.message || 'Checkout requires a redirect URL.')
      }
      if (typeof window !== 'undefined') {
        window.location.assign(redirectUrl)
      }
      return
    }

    if (response.payment?.redirect_url) {
      if (typeof window !== 'undefined') {
        window.location.assign(response.payment.redirect_url)
      }
      return
    }

    if (nextAction && nextAction.type !== 'none') {
      throw new Error(response.message || 'Unsupported checkout action.')
    }

    notifySuccess()
  }

  const handleNewCardPayment = async ({ token, billing }: { token: string; billing: BillingDetails }) => {
    const response = await subscribeWithCard({
      billing,
      provider,
      idempotencyKey,
      paymentToken: token,
      priceId: ensurePrice(),
    })

    handleCheckoutResponse(response)
  }

  const handleSavedMethodPayment = async ({ paymentMethodId }: { paymentMethodId: string }) => {
    const response = await subscribeWithSavedMethod({
      priceId: ensurePrice(),
      provider,
      paymentMethodId,
      email: userEmail ?? '',
      idempotencyKey,
    })
    handleCheckoutResponse(response)
  }

  const handleCcbillPayment = async ({ billing }: { billing: BillingDetails }) => {
    const response = await subscribeWithCCBill({
      billing,
      provider,
      idempotencyKey,
      priceId: ensurePrice(),
    })

    handleCheckoutResponse(response)
  }

  const solanaSuccess = (result: SubmitPaymentResponse | string) => {
    notifySuccess(result)
    onSolanaSuccess?.(result)
    onOpenChange(false)
  }

  const solanaError = (error: string) => {
    onSolanaError?.(error)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="z-[100] max-w-xl max-h-[90vh] overflow-y-auto border border-white/20 p-6 backdrop-blur-xl bg-background-regular rounded-md [&::-webkit-scrollbar]:hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">{t.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!priceId ? (
              <div className="flex items-center gap-2 text-center px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> <span>{t.selectPlanMessage}</span>
              </div>
            ) :
              (
                <PaymentExperience
                  usdAmount={usdAmount}
                  priceId={priceId ?? ''}
                  initialMode={initialMode}
                  onSolanaError={solanaError}
                  onSolanaSuccess={solanaSuccess}
                  enableNewCard={Boolean(priceId)}
                  enableStoredMethods={Boolean(priceId)}
                  userEmail={userEmail ?? undefined}
                  enableSolanaPay={enableSolanaPay && Boolean(priceId)}
                  onNewCardPayment={priceId ? handleNewCardPayment : undefined}
                  onSavedMethodPayment={priceId ? handleSavedMethodPayment : undefined}
                  onCcbillPayment={priceId ? handleCcbillPayment : undefined}
                  translations={t}
                />
              )
            }
          </div>
        </DialogContent>
      </Dialog>

      <SubscriptionSuccessDialog
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false)
        }}
        planName={planName}
        amountLabel={amountLabel ?? `$${usdAmount.toFixed(2)}`}
        billingPeriodLabel={billingPeriodLabel}
      />
    </>
  )
}
