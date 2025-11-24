import { useEffect, useState } from 'react'
import { Ban, TriangleAlert } from 'lucide-react'
import { Button } from '../../ui/button'
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
} from '../../ui/alert-dialog'
import { Label } from '../../ui/label'
import { Textarea } from '../../ui/textarea'
import { cn } from '../../lib/utils'
import { usePaymentContext } from '../../context/PaymentContext'
import type { NotificationHandler, NotificationPayload } from '../../types'

export interface CancelMembershipDialogProps {
  minReasonLength?: number
  onCancelled?: () => void
  onNotify?: NotificationHandler
}

const notifyDefault = (payload: NotificationPayload) => {
  const level = payload.status === 'destructive' ? 'error' : 'info'
  console[level === 'error' ? 'error' : 'log']('[payments-ui] cancellation', payload)
}

export const CancelMembershipDialog: React.FC<CancelMembershipDialogProps> = ({
  minReasonLength = 15,
  onCancelled,
  onNotify,
}) => {
  const { services } = usePaymentContext()
  const notify = onNotify ?? notifyDefault

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
      await services.subscriptions.cancelSubscription(cancelReason.trim())
      notify({
        title: 'Membership cancelled',
        description: 'Your subscription has been cancelled successfully.',
        status: 'success',
      })
      onCancelled?.()
      handleOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to cancel membership'
      notify({ title: 'Cancellation failed', description: message, status: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const showError = hasInteracted && !isReasonValid

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-destructive/50 text-destructive">
          <Ban className="mr-2 h-4 w-4" /> Cancel Membership
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-h-[90vh] overflow-y-auto rounded-md border border-border bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <TriangleAlert className="h-5 w-5 text-destructive" /> Confirm Membership Cancellation
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-3 space-y-3 text-muted-foreground">
            <p>You are about to cancel your membership. Please review the consequences:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>
                You will immediately lose access to premium features upon confirmation.
              </li>
              <li>Your benefits remain active until the end of the billing cycle.</li>
              <li>Your account will revert to the free plan afterwards.</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-2 py-2">
          <Label htmlFor="cancelReason" className="text-sm font-medium">
            Please provide a reason for cancellation (required):
          </Label>
          <Textarea
            id="cancelReason"
            value={cancelReason}
            onChange={handleReasonChange}
            placeholder="Your feedback helps us improve..."
            className={cn(
              'w-full resize-none border-border bg-background',
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
              ? `Reason must be at least ${minReasonLength} characters long.`
              : `Minimum ${minReasonLength} characters required.`}
          </p>
        </div>

        <AlertDialogFooter className="mt-6 gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="border-border text-muted-foreground">
              Keep Membership
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirm}
              disabled={!isReasonValid || isSubmitting}
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
