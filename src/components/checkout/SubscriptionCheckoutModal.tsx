import React, { useCallback, useState } from 'react'
import { Dialog, DialogContent } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { AlertCircle } from 'lucide-react'
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
  onSolanaSuccess?: (result: SubmitPaymentResponse | string) => void
  onSolanaError?: (error: string) => void
  initialMode?: 'cards' | 'solana'
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
          className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 [&::-webkit-scrollbar]:hidden"
        >
          <div className="p-6 space-y-6">
            {!priceId && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> Select a subscription plan to continue.
              </div>
            )}
            <PaymentExperience
              usdAmount={usdAmount}
              priceId={priceId ?? ''}
              onSolanaSuccess={solanaSuccess}
              onSolanaError={solanaError}
              enableNewCard={Boolean(priceId)}
              enableStoredMethods={Boolean(priceId)}
              enableSolanaPay={enableSolanaPay && Boolean(priceId)}
              onNewCardPayment={priceId ? handleNewCardPayment : undefined}
              onSavedMethodPayment={priceId ? handleSavedMethodPayment : undefined}
              initialMode={initialMode}
            />
          </div>
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
