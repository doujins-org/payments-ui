import React, { useMemo, useState } from 'react'
import { CreditCard, Loader2, Trash2, WalletCards } from 'lucide-react'
import { CardDetailsForm } from './CardDetailsForm'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import type { BillingDetails, PaymentMethod } from '../types'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { cn } from '../lib/utils'

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
  heading = 'Payment Methods',
  description = 'Manage your saved cards',
}) => {
  const { listQuery, createMutation, deleteMutation } = usePaymentMethods()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    <Card className="border-border/60 bg-card/95">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <WalletCards className="h-4 w-4" /> {heading}
            </span>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {showAddButton && (
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" /> Add card
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading cards…
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
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
                      'flex flex-col gap-3 rounded-lg border px-4 py-3 transition-colors md:flex-row md:items-center md:justify-between',
                      isSelected
                        ? 'border-primary/60 bg-primary/5'
                        : 'border-border/60 bg-background'
                    )}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCardLabel(method)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added on{' '}
                        {method.created_at
                          ? new Date(method.created_at).toLocaleDateString()
                          : 'unknown'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={method.is_active ? 'default' : 'secondary'}
                        className={cn(
                          method.is_active
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {method.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {method.failure_reason && (
                        <Badge variant="destructive">{method.failure_reason}</Badge>
                      )}
                      {onMethodSelect && (
                        <Button
                          size="sm"
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => onMethodSelect(method)}
                        >
                          {isSelected ? 'Selected' : 'Use card'}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleDelete(method)}
                        disabled={deletingId === method.id && deleteMutation.isPending}
                      >
                        {deletingId === method.id && deleteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
    </Card>
  )
}
