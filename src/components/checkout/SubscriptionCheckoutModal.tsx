import React, { useCallback, useMemo, useState } from 'react'
import { Dialog, DialogContent } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { AlertCircle, ShieldCheck } from 'lucide-react'
import { PaymentExperience } from '../PaymentExperience'
import { SubscriptionSuccessDialog } from './SubscriptionSuccessDialog'
import { useSubscriptionActions } from '../../hooks/useSubscriptionActions'
import type { BillingDetails, SubmitPaymentResponse } from '../../types'

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
}) => {
  const [showSuccess, setShowSuccess] = useState(false)
  const { subscribeWithCard, subscribeWithSavedMethod } = useSubscriptionActions()

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

  const handleNewCardPayment = async ({ token, billing }: { token: string; billing: BillingDetails }) => {
    await subscribeWithCard({
      priceId: ensurePrice(),
      provider,
      paymentToken: token,
      billing,
    })
    notifySuccess()
  }

  const handleSavedMethodPayment = async ({ paymentMethodId }: { paymentMethodId: string }) => {
    await subscribeWithSavedMethod({
      priceId: ensurePrice(),
      provider,
      paymentMethodId,
      email: userEmail ?? '',
    })
    notifySuccess()
  }

  const solanaSuccess = (result: SubmitPaymentResponse | string) => {
    notifySuccess(result)
    onOpenChange(false)
  }

  const summary = useMemo(() => {
    if (!planName && !amountLabel) return null
    return (
      <div className="rounded-2xl border border-border/60 bg-background/90 p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="text-2xl font-semibold text-foreground">
          {planName ?? 'Selected plan'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {amountLabel ?? `$${usdAmount.toFixed(2)}`}
          {billingPeriodLabel ? ` / ${billingPeriodLabel}` : ''}
        </p>
      </div>
    )
  }, [planName, amountLabel, billingPeriodLabel, usdAmount])

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-full max-w-3xl space-y-6">
          {!priceId && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> Select a subscription plan to continue.
            </div>
          )}

          <PaymentExperience
            usdAmount={usdAmount}
            priceId={priceId ?? ''}
            checkoutSummary={summary}
            onSolanaSuccess={solanaSuccess}
            enableNewCard={Boolean(priceId)}
            enableStoredMethods={Boolean(priceId)}
            enableSolanaPay={enableSolanaPay && Boolean(priceId)}
            onNewCardPayment={priceId ? handleNewCardPayment : undefined}
            onSavedMethodPayment={priceId ? handleSavedMethodPayment : undefined}
          />
        </DialogContent>
      </Dialog>
      <SubscriptionSuccessDialog
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        planName={planName}
        amountLabel={amountLabel ?? `$${usdAmount.toFixed(2)}`}
        billingPeriodLabel={billingPeriodLabel}
      />
    </>
  )
}
