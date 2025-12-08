import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import type { FlexFormResponse } from '../types/subscription'

interface AlternativePaymentDialogProps {
  form: FlexFormResponse | null
  onClose: () => void
}

export const AlternativePaymentDialog: React.FC<AlternativePaymentDialogProps> = ({ form, onClose }) => {
  const open = Boolean(form)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Complete payment with CCBill</DialogTitle>
        </DialogHeader>
        {form ? (
          <div className="space-y-4">
            <iframe
              title="CCBill Hosted Checkout"
              src={form.redirect_url}
              className="w-full border border-border"
              style={{ width: '100%', height: '600px' }}
            />
            <div className="text-right">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
