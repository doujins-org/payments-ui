import React from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { SolanaPaymentViewProps } from './SolanaPaymentView'
import { SolanaPaymentView } from './SolanaPaymentView'

export interface SolanaPaymentSelectorProps
  extends SolanaPaymentViewProps {
  isOpen: boolean
  onClose: () => void
}

export const SolanaPaymentSelector: React.FC<SolanaPaymentSelectorProps> = ({
  isOpen,
  onClose,
  ...props
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(value) => (value ? undefined : onClose())}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-md border border-border/70 bg-background/95 p-0 shadow-2xl [&::-webkit-scrollbar]:hidden">
        <SolanaPaymentView {...props} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
