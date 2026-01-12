import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCw, WalletCards } from 'lucide-react'
import type {
  NotificationHandler,
  NotificationPayload,
  PaginatedPaymentMethods,
  PaginatedSubscriptions,
  PaymentMethod,
  Subscription,
} from '../../types'
import { usePaymentContext } from '../../context/PaymentContext'
import { resolveErrorMessageByCode } from '../../utils/errorMessages'
import { CancelMembershipDialog, CancelMembershipDialogTranslations } from './CancelMembershipDialog'

export interface SubscriptionsSectionTranslations {
  title?: string
  description?: string
  loading?: string
  noSubscriptions?: string
  status?: string
  active?: string
  cancelled?: string
  pastDue?: string
  pending?: string
  paymentMethodLabel?: string
  changePaymentMethod?: string
  paymentMethodUpdated?: string
  paymentMethodUpdateFailed?: string
  resume?: string
  changePlan?: string
  changePlanPlaceholder?: string
  planChanged?: string
  planChangeFailed?: string
  resumeSuccess?: string
  resumeFailed?: string
  update?: string
  product?: string
  price?: string
  currentPeriod?: string
  refresh?: string
}

const notifyDefault = (payload: NotificationPayload) => {
  const level = payload.status === 'destructive' ? 'error' : 'info'
  console[level === 'error' ? 'error' : 'log']('[payments-ui] notification', payload)
}

const defaultTranslations: Required<SubscriptionsSectionTranslations> = {
  title: 'Subscriptions',
  description: 'Manage your active and recent subscriptions.',
  loading: 'Loading subscriptions...',
  noSubscriptions: 'No subscriptions found.',
  status: 'Status',
  active: 'Active',
  cancelled: 'Cancelled',
  pastDue: 'Past due',
  pending: 'Pending',
  paymentMethodLabel: 'Payment method',
  changePaymentMethod: 'Change payment method',
  paymentMethodUpdated: 'Payment method updated',
  paymentMethodUpdateFailed: 'Unable to update payment method',
  resume: 'Resume subscription',
  changePlan: 'Change plan',
  changePlanPlaceholder: 'Enter a new price ID',
  planChanged: 'Subscription updated',
  planChangeFailed: 'Unable to update subscription',
  resumeSuccess: 'Resume requested',
  resumeFailed: 'Unable to resume subscription',
  update: 'Update',
  product: 'Product',
  price: 'Price',
  currentPeriod: 'Current period',
  refresh: 'Refresh',
}

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
  const brand = 'CARD'
  const lastFour = ''
  return `${brand} ${lastFour}`.trim()
}

export interface SubscriptionsSectionProps {
  isAuthenticated?: boolean
  translations?: SubscriptionsSectionTranslations
  onNotify?: NotificationHandler
  statusFilter?: string
  cancelDialogTranslations?: CancelMembershipDialogTranslations
}

export const SubscriptionsSection: React.FC<SubscriptionsSectionProps> = ({
  isAuthenticated = true,
  translations: customTranslations,
  onNotify,
  statusFilter,
  cancelDialogTranslations,
}) => {
  const { client, queryClient } = usePaymentContext()
  const notify = onNotify ?? notifyDefault
  const t = { ...defaultTranslations, ...customTranslations }

  const [paymentSelections, setPaymentSelections] = useState<Record<string, string>>({})
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({})

  const subscriptionsQueryKey = ['payments-ui', 'subscriptions', statusFilter]
  const paymentMethodsQueryKey = ['payments-ui', 'payment-methods']

  const subscriptionsQuery = useQuery<PaginatedSubscriptions>({
    queryKey: subscriptionsQueryKey,
    queryFn: () => client.listSubscriptions({ status: statusFilter ?? undefined, limit: 50 }),
    enabled: isAuthenticated && !!client,
    staleTime: 30_000,
  })

  const paymentMethodsQuery = useQuery<PaginatedPaymentMethods>({
    queryKey: paymentMethodsQueryKey,
    queryFn: () => client.listPaymentMethods({ limit: 50 }),
    enabled: isAuthenticated && !!client,
    staleTime: 30_000,
  })

  const subscriptions = useMemo(() => subscriptionsQuery.data?.data ?? [], [subscriptionsQuery.data])
  const paymentMethods = useMemo(() => paymentMethodsQuery.data?.data ?? [], [paymentMethodsQuery.data])

  useEffect(() => {
    const nextSelections: Record<string, string> = {}
    subscriptions.forEach((sub) => {
      if (sub.payment_method_id) {
        nextSelections[sub.id] = sub.payment_method_id
      }
    })
    setPaymentSelections((prev) => ({ ...nextSelections, ...prev }))
  }, [subscriptions])

  const updatePaymentMethodMutation = useMutation({
    mutationFn: (payload: { subscriptionId: string; paymentMethodId: string }) =>
      client.updateSubscriptionPaymentMethod({
        subscription_id: payload.subscriptionId,
        payment_method_id: payload.paymentMethodId,
      }),
    onSuccess: () => {
      notify({ title: t.paymentMethodUpdated, status: 'success' })
      void queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey })
    },
    onError: (error) => {
      notify({
        title: t.paymentMethodUpdateFailed,
        description: resolveErrorMessageByCode(error, {}, error.message),
        status: 'destructive',
      })
    },
  })

  const resumeSubscriptionMutation = useMutation({
    mutationFn: () => client.resumeSubscription(),
    onSuccess: () => {
      notify({ title: t.resumeSuccess, status: 'success' })
      void queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey })
    },
    onError: (error) => {
      notify({
        title: t.resumeFailed,
        description: resolveErrorMessageByCode(error, {}, error.message),
        status: 'destructive',
      })
    },
  })

  const changeSubscriptionMutation = useMutation({
    mutationFn: (payload: { priceId: string }) => client.changeSubscription({ price_id: payload.priceId }),
    onSuccess: () => {
      notify({ title: t.planChanged, status: 'success' })
      void queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey })
    },
    onError: (error) => {
      notify({
        title: t.planChangeFailed,
        description: resolveErrorMessageByCode(error, {}, error.message),
        status: 'destructive',
      })
    },
  })

  const isLoading = subscriptionsQuery.isLoading || subscriptionsQuery.isFetching

  const formatPrice = (sub: Subscription) => {
    const price = sub.price
    if (!price) return t.price
    const amount = (price.amount / 100).toFixed(2)
    return `${price.display_name ?? t.price} — ${price.currency ?? ''} ${amount}`
  }

  const renderStatusBadge = (status: string) => {
    const normalized = status.toLowerCase()
    const label =
      normalized === 'active'
        ? t.active
        : normalized === 'past_due'
          ? t.pastDue
          : normalized === 'pending'
            ? t.pending
            : t.cancelled
    const variant =
      normalized === 'active'
        ? 'default'
        : normalized === 'past_due'
          ? 'destructive'
          : normalized === 'pending'
            ? 'outline'
            : 'secondary'
    return <Badge variant={variant}>{label}</Badge>
  }

  const handleUpdatePaymentMethod = (subscriptionId: string) => {
    const paymentMethodId = paymentSelections[subscriptionId]
    if (!paymentMethodId) return
    updatePaymentMethodMutation.mutate({ subscriptionId, paymentMethodId })
  }

  const handleChangePrice = (subscriptionId: string) => {
    const priceId = priceInputs[subscriptionId]
    if (!priceId) return
    changeSubscriptionMutation.mutate({ priceId })
  }

  return (
    <Card className="border-0 bg-black/30 shadow-2xl backdrop-blur-xl">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <WalletCards className="h-5 w-5" />
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => subscriptionsQuery.refetch?.()}
          disabled={subscriptionsQuery.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> {subscriptionsQuery.isFetching ? t.loading : t.refresh}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-white/60">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.loading}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-6 text-sm text-center">
            {t.noSubscriptions}
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((subscription) => {
              const isCancelled = subscription.status.toLowerCase() === 'cancelled'
              return (
                <div
                  key={subscription.id}
                  className="rounded-lg border bg-white/5 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-base font-semibold text-white">
                        {subscription.product?.display_name ?? t.product}
                      </div>
                      <div className="text-sm text-white/80">
                        {formatPrice(subscription)}
                      </div>
                      <div className="text-xs text-white/60">
                        {t.currentPeriod}: {subscription.current_period_starts_at ?? '—'} → {subscription.current_period_ends_at ?? '—'}
                      </div>
                    </div>
                    {renderStatusBadge(subscription.status)}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="text-xs uppercase tracking-wide text-white/60">{t.paymentMethodLabel}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={paymentSelections[subscription.id]}
                        onValueChange={(value) =>
                          setPaymentSelections((prev) => ({ ...prev, [subscription.id]: value }))
                        }
                        disabled={paymentMethodsQuery.isLoading || paymentMethods.length === 0}
                      >
                        <SelectTrigger className="w-64 text-white">
                          <SelectValue placeholder={paymentMethodsQuery.isLoading ? t.loading : ''} />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {formatCardLabel(method)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleUpdatePaymentMethod(subscription.id)}
                        disabled={updatePaymentMethodMutation.isPending}
                      >
                        {updatePaymentMethodMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t.update}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="text-xs uppercase tracking-wide text-white/60">{t.changePlan}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="w-64"
                        value={priceInputs[subscription.id] ?? ''}
                        onChange={(e) =>
                          setPriceInputs((prev) => ({ ...prev, [subscription.id]: e.target.value }))
                        }
                        placeholder={t.changePlanPlaceholder}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangePrice(subscription.id)}
                        disabled={changeSubscriptionMutation.isPending}
                      >
                        {changeSubscriptionMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t.update}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isCancelled ? (
                      <CancelMembershipDialog
                        translations={cancelDialogTranslations}
                        onNotify={onNotify}
                        onCancelled={() => {
                          void queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey })
                        }}
                      />
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => resumeSubscriptionMutation.mutate()}
                        disabled={resumeSubscriptionMutation.isPending}
                      >
                        {resumeSubscriptionMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t.resume}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
