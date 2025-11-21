import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Loader2, Trash2, WalletCards } from 'lucide-react'
import { Button } from '../../ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { Badge } from '../../ui/badge'
import { CardDetailsForm } from '../CardDetailsForm'
import type {
  BillingDetails,
  CreatePaymentMethodPayload,
  NotificationHandler,
  NotificationPayload,
  PaginatedPaymentMethods,
  PaymentMethod,
} from '../../types'
import { usePaymentMethodService } from '../../hooks/usePaymentMethodService'

export interface PaymentMethodsSectionProps {
  isAuthenticated?: boolean
  userEmail?: string | null
  provider?: string
  defaultCountry?: string
  collectPrefix?: string
  onNotify?: NotificationHandler
}

const formatCardLabel = (method: PaymentMethod): string => {
  const brand = method.card_type ? method.card_type.toUpperCase() : 'CARD'
  const lastFour = method.last_four ? `•••• ${method.last_four}` : ''
  return `${brand} ${lastFour}`.trim()
}

const notifyDefault = (payload: NotificationPayload) => {
  const level = payload.status === 'destructive' ? 'error' : 'info'
  console[level === 'error' ? 'error' : 'log']('[payments-ui] notification', payload)
}

export const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({
  isAuthenticated = true,
  userEmail,
  provider = 'mobius',
  defaultCountry = 'US',
  collectPrefix = 'account-card',
  onNotify,
}) => {
  const paymentMethods = usePaymentMethodService()
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notify = onNotify ?? notifyDefault

  const queryKey = ['payments-ui', 'payment-methods']

  const paymentQuery = useQuery<PaginatedPaymentMethods>({
    queryKey,
    queryFn: () => paymentMethods.list({ pageSize: 50 }),
    enabled: isAuthenticated,
    staleTime: 30_000,
  })

  const createMutation = useMutation<PaymentMethod, Error, CreatePaymentMethodPayload>({
    mutationFn: (payload) => paymentMethods.create(payload),
    onSuccess: () => {
      notify({ title: 'Card added successfully', status: 'success' })
      setIsModalOpen(false)
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      notify({
        title: 'Unable to add card',
        description: error.message,
        status: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => paymentMethods.remove(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      notify({ title: 'Card removed', status: 'success' })
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      notify({
        title: 'Unable to remove card',
        description: error.message,
        status: 'destructive',
      })
    },
    onSettled: () => setDeletingId(null),
  })

  useEffect(() => {
    if (!isModalOpen) {
      createMutation.reset()
    }
  }, [createMutation, isModalOpen])

  const payments = useMemo(() => paymentQuery.data?.data ?? [], [paymentQuery.data])
  const loading = paymentQuery.isLoading || paymentQuery.isFetching

  const handleCardTokenize = (token: string, billing: BillingDetails) => {
    const payload: CreatePaymentMethodPayload = {
      payment_token: token,
      first_name: billing.firstName,
      last_name: billing.lastName,
      address1: billing.address1,
      address2: billing.address2,
      city: billing.city,
      state: billing.stateRegion,
      zip: billing.postalCode,
      country: billing.country,
      email: billing.email,
      provider: billing.provider,
    }

    createMutation.mutate(payload)
  }

  return (
    <Card className="border-0 bg-background/5 shadow-lg">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <WalletCards className="h-5 w-5 text-primary" /> Payment Methods
          </CardTitle>
          <CardDescription>Manage your saved billing cards</CardDescription>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <CreditCard className="mr-2 h-4 w-4" /> Add card
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading cards...
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-sm text-muted-foreground">
            No saved payment methods yet.
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((method) => (
              <div
                key={method.id}
                className="rounded-lg border border-border/80 bg-background/40 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-base font-medium text-foreground">
                      {formatCardLabel(method)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Added on{' '}
                      {method.created_at
                        ? new Date(method.created_at).toLocaleDateString()
                        : 'unknown date'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={method.is_active ? 'default' : 'secondary'}
                      className={method.is_active ? 'bg-emerald-500/20 text-emerald-400' : ''}
                    >
                      {method.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {method.failure_reason && (
                      <Badge variant="destructive">{method.failure_reason}</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === method.id && deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(method.id)}
                  >
                    {deletingId === method.id && deleteMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[95vh] overflow-y-auto border border-border bg-background">
          <DialogHeader>
            <DialogTitle>Add a new card</DialogTitle>
            <DialogDescription>
              Your card details are tokenized securely via our payment provider.
            </DialogDescription>
          </DialogHeader>

          <CardDetailsForm
            visible={isModalOpen}
            collectPrefix={collectPrefix}
            submitting={createMutation.isPending}
            submitLabel="Save card"
            defaultValues={{
              email: userEmail ?? '',
              country: defaultCountry,
              provider,
            }}
            externalError={createMutation.error?.message ?? null}
            onTokenize={handleCardTokenize}
            className="rounded-2xl border border-border bg-muted/20 p-6"
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
