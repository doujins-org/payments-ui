import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog'
import { Button } from '../../ui/button'
import { CheckCircle } from 'lucide-react'

interface SubscriptionSuccessDialogProps {
  open: boolean
  planName?: string
  amountLabel?: string
  billingPeriodLabel?: string
  onClose: () => void
}

export const SubscriptionSuccessDialog: React.FC<SubscriptionSuccessDialogProps> = ({
  open,
  planName = 'Premium Plan',
  amountLabel = '$0.00',
  billingPeriodLabel = 'billing period',
  onClose,
}) => {
  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) onClose()
    }}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center gap-3 text-foreground">
            <CheckCircle className="h-10 w-10 text-primary" />
            Subscription activated
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            You now have access to {planName}. Billing: {amountLabel} / {billingPeriodLabel}.
          </DialogDescription>
        </DialogHeader>
        <Button className="mt-6 w-full" onClick={onClose}>
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  )
}
