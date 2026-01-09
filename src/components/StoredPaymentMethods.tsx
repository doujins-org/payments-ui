import React, { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import type { PaymentMethod } from '../types'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ScrollArea } from '../components/ui/scroll-area'
import { cn } from '../lib/utils'
import clsx from 'clsx'

const formatCardLabel = (method: PaymentMethod): string => {
  if (method.card) {
    const brand = method.card.brand ? method.card.brand.toUpperCase() : 'CARD'
    const lastFour = method.card.last4 ? `•••• ${method.card.last4}` : ''
    const exp =
      method.card.exp_month && method.card.exp_year
        ? ` • ${String(method.card.exp_month).padStart(2, '0')}/${String(method.card.exp_year).slice(-2)}`
        : ''
    return `${brand} ${lastFour}${exp}`.trim()
  }
  return 'CARD'
}

export interface StoredPaymentMethodsProps {
  selectedMethodId?: string | null
  onMethodSelect?: (method: PaymentMethod) => void
  heading?: string
  description?: string
}

export const StoredPaymentMethods: React.FC<StoredPaymentMethodsProps> = ({
  selectedMethodId,
  onMethodSelect,
}) => {
  const { listQuery } = usePaymentMethods()
  const payments = useMemo(() => listQuery.data?.data ?? [], [listQuery.data])

  return (
    <div className="space-y-4">
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
                    'bg-muted/20': isSelected
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
                        disabled={isSelected}
                        onClick={() => onMethodSelect(method)}
                        className={clsx('px-3', { 'bg-muted/90': !isSelected, 'bg-inherit': isSelected })}
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
    </div>
  )
}
