import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../ui/dialog'
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
      <DialogContent className="w-full max-w-md overflow-hidden border border-border/70 bg-background/95 p-0 shadow-2xl">
        <div className="bg-gradient-to-b from-primary/25 via-primary/10 to-background px-6 py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background/60">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-foreground">
              Subscription activated
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              You now have access to {planName}. Billing: {amountLabel} / {billingPeriodLabel}.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="px-6 py-6">
          <Button className="w-full" onClick={onClose}>
            Continue exploring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
