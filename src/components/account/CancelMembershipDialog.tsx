import { useEffect, useState } from 'react'
import { Ban, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '../../lib/utils'
import type { NotificationHandler, NotificationPayload } from '../../types'
import { usePaymentContext } from '../../context/PaymentContext'

export interface CancelMembershipDialogTranslations {
  buttonLabel?: string
  title?: string
  description?: string
  consequence1?: string
  consequence2?: string
  consequence3?: string
  reasonLabel?: string
  reasonPlaceholder?: string
  reasonError?: string
  reasonHint?: string
  keepMembership?: string
  confirmCancellation?: string
  cancelling?: string
  membershipCancelled?: string
  cancellationSuccess?: string
  cancellationFailed?: string
}

export interface CancelMembershipDialogProps {
  minReasonLength?: number
  onCancelled?: () => void
  onNotify?: NotificationHandler
  translations?: CancelMembershipDialogTranslations
}

const notifyDefault = (payload: NotificationPayload) => {
  const level = payload.status === 'destructive' ? 'error' : 'info'
  console[level === 'error' ? 'error' : 'log']('[payments-ui] cancellation', payload)
}

const defaultTranslations: Required<CancelMembershipDialogTranslations> = {
  buttonLabel: 'Cancel Membership',
  title: 'Confirm Membership Cancellation',
  description: 'You are about to cancel your membership. Please review the consequences:',
  consequence1: 'You will immediately lose access to premium features upon confirmation.',
  consequence2: 'Your benefits remain active until the end of the billing cycle.',
  consequence3: 'Your account will revert to the free plan afterwards.',
  reasonLabel: 'Please provide a reason for cancellation (required):',
  reasonPlaceholder: 'Your feedback helps us improve...',
  reasonError: 'Reason must be at least {min} characters long.',
  reasonHint: 'Minimum {min} characters required.',
  keepMembership: 'Keep Membership',
  confirmCancellation: 'Confirm Cancellation',
  cancelling: 'Cancelling...',
  membershipCancelled: 'Membership cancelled',
  cancellationSuccess: 'Your subscription has been cancelled successfully.',
  cancellationFailed: 'Cancellation failed',
}

export const CancelMembershipDialog: React.FC<CancelMembershipDialogProps> = ({
  minReasonLength = 15,
  onCancelled,
  onNotify,
  translations: customTranslations,
}) => {
  const { client } = usePaymentContext()
  const notify = onNotify ?? notifyDefault
  const t = { ...defaultTranslations, ...customTranslations }

  const [cancelReason, setCancelReason] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isReasonValid, setIsReasonValid] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const trimmed = cancelReason.trim()
    setIsReasonValid(trimmed.length >= minReasonLength)
  }, [cancelReason, minReasonLength])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setCancelReason('')
      setIsReasonValid(false)
      setHasInteracted(false)
      setIsSubmitting(false)
    }
  }

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCancelReason(e.target.value)
    if (!hasInteracted) {
      setHasInteracted(true)
    }
  }

  const handleConfirm = async () => {
    if (!isReasonValid) {
      setHasInteracted(true)
      return
    }

    setIsSubmitting(true)
    try {
      await client.cancelSubscription(cancelReason.trim())
      notify({
        title: t.membershipCancelled,
        description: t.cancellationSuccess,
        status: 'success',
      })
      onCancelled?.()
      handleOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to cancel membership'
      notify({ title: t.cancellationFailed, description: message, status: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showError = hasInteracted && !isReasonValid

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-destructive/50 text-destructive">
          <Ban className="mr-2 h-4 w-4" /> {t.buttonLabel}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="z-[100] max-h-[90vh] overflow-y-auto rounded-md border border-white/20 p-6 backdrop-blur-xl bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <TriangleAlert className="h-5 w-5 text-destructive" /> {t.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-3 space-y-3 text-muted-foreground">
            <p>{t.description}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>{t.consequence1}</li>
              <li>{t.consequence2}</li>
              <li>{t.consequence3}</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-2 py-2">
          <Label htmlFor="cancelReason" className="text-sm font-medium text-foreground">
            {t.reasonLabel}
          </Label>
          <Textarea
            id="cancelReason"
            value={cancelReason}
            onChange={handleReasonChange}
            placeholder={t.reasonPlaceholder}
            className={cn(
              'w-full resize-none border-white/20 bg-foreground/5 text-foreground placeholder:text-muted-foreground',
              showError && 'border-destructive'
            )}
            rows={4}
            aria-describedby="reason-hint"
            aria-invalid={showError}
          />
          <p
            id="reason-hint"
            className={`text-xs ${showError ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {showError
              ? t.reasonError.replace('{min}', String(minReasonLength))
              : t.reasonHint.replace('{min}', String(minReasonLength))}
          </p>
        </div>

        <AlertDialogFooter className="mt-6 gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="border-white/20 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground">
              {t.keepMembership}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              onClick={handleConfirm}
              disabled={!isReasonValid || isSubmitting}
            >
              {isSubmitting ? t.cancelling : t.confirmCancellation}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
