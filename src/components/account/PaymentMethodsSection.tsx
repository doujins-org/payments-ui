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
	const [methodBeingReplaced, setMethodBeingReplaced] = useState<PaymentMethod | null>(null)
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

	const replaceMutation = useMutation<PaymentMethod, Error, { id: string; payload: CreatePaymentMethodPayload }>({
		mutationFn: ({ id, payload }) => paymentMethods.update(id, payload),
		onSuccess: () => {
			notify({ title: 'Card updated', status: 'success' })
			setMethodBeingReplaced(null)
			void queryClient.invalidateQueries({ queryKey })
		},
		onError: (error) => {
			notify({
				title: 'Unable to replace card',
				description: error.message,
				status: 'destructive',
			})
		},
	})

	const activateMutation = useMutation<void, Error, string>({
		mutationFn: (id) => paymentMethods.activate(id),
		onSuccess: () => {
			notify({ title: 'Default payment method updated', status: 'success' })
			void queryClient.invalidateQueries({ queryKey })
		},
		onError: (error) => {
			notify({
				title: 'Unable to set default payment method',
				description: error.message,
				status: 'destructive',
			})
		},
	})

  useEffect(() => {
    if (!isModalOpen) {
      createMutation.reset()
    }
  }, [createMutation, isModalOpen])

  const payments = useMemo(() => paymentQuery.data?.data ?? [], [paymentQuery.data])
  const loading = paymentQuery.isLoading || paymentQuery.isFetching

  const buildPayload = (token: string, billing: BillingDetails): CreatePaymentMethodPayload => ({
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
  })

  const handleCardTokenize = (token: string, billing: BillingDetails) => {
    createMutation.mutate(buildPayload(token, billing))
  }

  const handleReplaceTokenize = (token: string, billing: BillingDetails) => {
    if (!methodBeingReplaced) return
    replaceMutation.mutate({ id: methodBeingReplaced.id, payload: buildPayload(token, billing) })
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-emerald-400" /> Payment Methods
          </CardTitle>
          <CardDescription>Manage your saved billing cards</CardDescription>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <CreditCard className="mr-2 h-4 w-4" /> Add card
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-white/60">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading cards...
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-6 text-sm text-white/60">
            No saved payment methods yet.
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((method) => (
              <div
                key={method.id}
                className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-base font-medium text-white">
                      {formatCardLabel(method)}
                    </h4>
                    <p className="text-sm text-white/60">
                      Added on{' '}
                      {method.created_at
                        ? new Date(method.created_at).toLocaleDateString()
                        : 'unknown date'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant={method.is_active ? 'default' : 'secondary'}
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
                    className="text-blue-400"
                    disabled={replaceMutation.isPending && methodBeingReplaced?.id === method.id}
                    onClick={() => setMethodBeingReplaced(method)}
                  >
                    {replaceMutation.isPending && methodBeingReplaced?.id === method.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    Replace card
                  </Button>
                  <Button
                    variant="outline"
                    disabled={method.is_active || activateMutation.isPending}
                    onClick={() => activateMutation.mutate(method.id)}
                  >
                    {activateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {method.is_active ? 'Default method' : 'Make default'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
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
        <DialogContent className="max-h-[95vh] overflow-y-auto">
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
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(methodBeingReplaced)} onOpenChange={(open) => !open && setMethodBeingReplaced(null)}>
        <DialogContent className="max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Replace card</DialogTitle>
            <DialogDescription>Update this card with new billing details.</DialogDescription>
          </DialogHeader>

          {methodBeingReplaced && (
            <CardDetailsForm
              visible
              collectPrefix={`${collectPrefix}-replace-${methodBeingReplaced.id}`}
              submitting={replaceMutation.isPending}
              submitLabel="Replace card"
              defaultValues={{
                email: userEmail ?? '',
                country: defaultCountry,
                provider,
              }}
              externalError={replaceMutation.error?.message ?? null}
              onTokenize={handleReplaceTokenize}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
