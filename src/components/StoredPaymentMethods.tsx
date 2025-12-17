import React, { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CardDetailsForm } from './CardDetailsForm'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import type { BillingDetails, PaymentMethod } from '../types'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Badge } from '../components/ui/badge'
import { ScrollArea } from '../components/ui/scroll-area'
import { cn } from '../lib/utils'
import clsx from 'clsx'

const formatCardLabel = (method: PaymentMethod): string => {
  const brand = method.card_type ? method.card_type.toUpperCase() : 'CARD'
  const lastFour = method.last_four ? `•••• ${method.last_four}` : ''
  return `${brand} ${lastFour}`.trim()
}

export interface StoredPaymentMethodsProps {
  selectedMethodId?: string | null
  onMethodSelect?: (method: PaymentMethod) => void
  showAddButton?: boolean
  heading?: string
  description?: string
}

export const StoredPaymentMethods: React.FC<StoredPaymentMethodsProps> = ({
  selectedMethodId,
  onMethodSelect,
  showAddButton = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { listQuery, createMutation, deleteMutation } = usePaymentMethods()

  const payments = useMemo(() => listQuery.data?.data ?? [], [listQuery.data])

  const handleCardTokenize = (token: string, billing: BillingDetails) => {
    createMutation.mutate({ token, billing })
  }

  const handleDelete = (method: PaymentMethod) => {
    setDeletingId(method.id)
    deleteMutation.mutate(
      { id: method.id },
      {
        onSettled: () => setDeletingId(null),
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        {showAddButton && (
          <Button size="sm" variant="ghost" onClick={() => setIsModalOpen(true)}>
            Add card
          </Button>
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading cards...
        </div>
      ) : payments.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No saved payment methods yet.
        </div>
      ) : (
        <ScrollArea className="max-h-[320px] pr-2">
          <div className="space-y-3">
            {payments.map((method) => {
              const isSelected = selectedMethodId === method.id

              return (
                <div
                  key={method.id}
                  className={cn(
                    'flex border border-border rounded-md px-4 py-3 flex-row items-center justify-between', {
                    'bg-primary/5': isSelected
                  }
                  )}
                >
                  <div className="text-sm font-semibold text-foreground">
                    {formatCardLabel(method)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {method.failure_reason && (<Badge variant="destructive">{method.failure_reason}</Badge>)}

                    {onMethodSelect && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMethodSelect(method)}
                        className={clsx('px-3', { 'bg-muted/90': !isSelected, 'bg-background': isSelected })}
                      >
                        {isSelected ? 'Selected' : 'Use card'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a new card</DialogTitle>
            <DialogDescription>
              Your card details are tokenized securely via our payment provider.
            </DialogDescription>
          </DialogHeader>
          <CardDetailsForm
            visible={isModalOpen}
            collectPrefix="payments-ui-card"
            submitting={createMutation.isPending}
            submitLabel="Save card"
            externalError={createMutation.error?.message ?? null}
            onTokenize={handleCardTokenize}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
