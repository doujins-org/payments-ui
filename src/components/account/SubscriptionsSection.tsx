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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronDown, Loader2, RefreshCw, WalletCards } from 'lucide-react'
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
import {
  CancelMembershipDialog,
  CancelMembershipDialogTranslations,
  defaultTranslations as cancelDialogDefaultTranslations,
} from './CancelMembershipDialog'

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
  planChangeUnavailable?: string
  resumeSuccess?: string
  resumeFailed?: string
  update?: string
  product?: string
  price?: string
  currentPeriod?: string
  refresh?: string
  manage?: string
  close?: string
  paymentMethodTab?: string
  changePlanTab?: string
  statusTab?: string
  cancelTab?: string
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
  planChangeUnavailable: 'Plan changes are unavailable for this subscription.',
  resumeSuccess: 'Resume requested',
  resumeFailed: 'Unable to resume subscription',
  update: 'Update',
  product: 'Product',
  price: 'Price',
  currentPeriod: 'Current period',
  refresh: 'Refresh',
  manage: 'Manage',
  close: 'Close',
  paymentMethodTab: 'Payment method',
  changePlanTab: 'Change plan',
  statusTab: 'Details',
  cancelTab: 'Cancel/Resume',
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
  onCancelled?: () => void
}

export const SubscriptionsSection: React.FC<SubscriptionsSectionProps> = ({
  isAuthenticated = true,
  translations: customTranslations,
  onNotify,
  statusFilter,
  cancelDialogTranslations,
  onCancelled,
}) => {
  const { client, queryClient } = usePaymentContext()
  const notify = onNotify ?? notifyDefault
  const t = { ...defaultTranslations, ...customTranslations }
  const cancelTranslations = cancelDialogTranslations ?? cancelDialogDefaultTranslations

  const [paymentSelections, setPaymentSelections] = useState<Record<string, string>>({})
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({})
  const [activeSubId, setActiveSubId] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState<Record<string, boolean>>({
    status: true,
    payment: false,
    plan: false,
    cancel: false,
  })

  const normalizedStatusFilter = statusFilter ?? 'all'
  const subscriptionsQueryKey = ['payments-ui', 'subscriptions', normalizedStatusFilter]
  const paymentMethodsQueryKey = ['payments-ui', 'payment-methods']

  const subscriptionsQuery = useQuery<PaginatedSubscriptions>({
    queryKey: subscriptionsQueryKey,
    queryFn: () =>
      client.listSubscriptions({
        status: normalizedStatusFilter,
        limit: 50,
      }),
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
  const activeSubscription = useMemo(
    () => subscriptions.find((sub) => sub.id === activeSubId),
    [subscriptions, activeSubId]
  )

  useEffect(() => {
    setPaymentSelections((prev) => {
      const next: Record<string, string> = {}
      subscriptions.forEach((sub) => {
        next[sub.id] = prev[sub.id] ?? ''
      })
      return next
    })
  }, [subscriptions])

  useEffect(() => {
    setCancelDialogOpen(false)
    /*setSectionsOpen({
      status: true,
      payment: true,
      plan: !!activeSubscription?.price?.id,
      cancel: false,
    })*/
  }, [activeSubId])

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
  const isError = subscriptionsQuery.isError
  const errorMessage =
    subscriptionsQuery.error instanceof Error
      ? subscriptionsQuery.error.message
      : undefined

  useEffect(() => {
    if (subscriptionsQuery.refetch) {
      void subscriptionsQuery.refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatPrice = (sub: Subscription) => {
    const price = sub.price
    if (!price) return t.price
    const amount = (price.amount / 100).toFixed(2)
    const currency = price.currency ? price.currency?.toUpperCase() : ''
    return `${price.display_name ?? t.price} — ${currency} ${amount}`
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
    const currentPaymentMethodId = "pm_" +subscriptions.find((s) => s.id === subscriptionId)?.payment_method_id
    if (!paymentMethodId) return
    if (currentPaymentMethodId && paymentMethodId === currentPaymentMethodId) {
      notify({
        title: t.paymentMethodUpdateFailed,
        description: t.paymentMethodUpdateFailed,
        status: 'destructive',
      })
      return
    }
    updatePaymentMethodMutation.mutate({ subscriptionId, paymentMethodId })
  }

  const handleChangePrice = (subscriptionId: string) => {
    const priceId = priceInputs[subscriptionId]
    if (!priceId) return
    changeSubscriptionMutation.mutate({ priceId })
  }

  const toggleSection = (key: string) => {
    setSectionsOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <>
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
          ) : isError ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {errorMessage ?? 'Unable to load subscriptions.'}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="p-6 text-sm text-center">
              {t.noSubscriptions}
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((subscription) => {
                return (
                  <div
                    key={subscription.id}
                    className="rounded-lg border bg-white/5 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold text-white">
                          {subscription.product?.display_name ?? t.product}
                        </div>
                        <div className="text-sm text-white/80">
                          {formatPrice(subscription)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderStatusBadge(subscription.status)}
                        <Button
                          variant="default"
                          size="sm"
                          className="rounded-full bg-foreground/10 text-muted-foreground hover:bg-foreground/20 hover:text-foreground"
                          onClick={() => setActiveSubId(subscription.id)}
                        >
                          {t.update}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

    <Dialog open={!!activeSubscription} onOpenChange={(open) => setActiveSubId(open ? activeSubId : null)}>
      <DialogContent className="max-w-2xl min-h-[300px] border border-white/20 bg-background-regular p-6 text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activeSubscription?.product?.display_name ?? t.product}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {activeSubscription ? formatPrice(activeSubscription) : null}
          </DialogDescription>
        </DialogHeader>

        {activeSubscription && (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-lg border border-white/15 bg-white/5">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-white hover:bg-white/10"
                onClick={() => toggleSection('status')}
              >
                <span className="text-sm font-semibold">{t.statusTab}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${sectionsOpen.status ? 'rotate-180' : ''}`}
                />
              </button>
              {sectionsOpen.status ? (
                <div className="space-y-3 border-t border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-sm font-medium text-white/80">{t.status}</div>
                    {renderStatusBadge(activeSubscription.status)}
                  </div>
                  <div className="text-xs text-white/60">
                    {t.currentPeriod}: {activeSubscription.started_at ? new Date(activeSubscription.started_at).toLocaleDateString() : '—'} →{' '}
                    {activeSubscription.current_period_ends_at ?? '—'}
                  </div>
                  {activeSubscription.status.toLowerCase() === 'cancelled' ? (
                    <Button
                      variant="secondary"
                      onClick={() => resumeSubscriptionMutation.mutate()}
                      disabled={resumeSubscriptionMutation.isPending}
                      className="rounded-full px-4"
                    >
                      {resumeSubscriptionMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t.resume}
                    </Button>
                  ) : (
                    null
                  )}
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-white/15 bg-white/5">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-white hover:bg-white/10"
                onClick={() => toggleSection('payment')}
              >
                <span className="text-sm font-semibold">{t.paymentMethodTab}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${sectionsOpen.payment ? 'rotate-180' : ''}`}
                />
              </button>
              {sectionsOpen.payment ? (
                <div className="space-y-2 border-t border-white/10 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-white/60">{t.paymentMethodLabel}</div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
                    
                    <Select
                      value={
                        paymentSelections[activeSubscription.id] ||
                        "pm_" + activeSubscription.payment_method_id ||
                        ''
                      }
                      onValueChange={(value) =>
                        setPaymentSelections((prev) => ({ ...prev, [activeSubscription.id]: value }))
                      }
                      disabled={paymentMethodsQuery.isLoading || paymentMethods.length === 0}
                    >
                      <SelectTrigger className="w-full md:w-64 text-white">
                        <SelectValue placeholder={paymentMethodsQuery.isLoading ? t.loading : ''} />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods
                          .filter((method) => method.id !== activeSubscription.payment_method_id)
                          .map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {formatCardLabel(method)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleUpdatePaymentMethod(activeSubscription.id)}
                      disabled={
                        updatePaymentMethodMutation.isPending ||
                        !paymentSelections[activeSubscription.id] ||
                        paymentSelections[activeSubscription.id] === activeSubscription.payment_method_id
                      }
                       className="border-0 bg-green-bg text-white hover:bg-green-bg/80 disabled:opacity-50"
                    >
                      {updatePaymentMethodMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {t.update}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-white/15 bg-white/5">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left text-white hover:bg-white/10 disabled:opacity-50"
                onClick={() => toggleSection('plan')}
                disabled={!activeSubscription.price?.id}
              >
                <span className="text-sm font-semibold">{t.changePlanTab}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${sectionsOpen.plan ? 'rotate-180' : ''}`}
                />
              </button>
              {sectionsOpen.plan ? (
                <div className="space-y-2 border-t border-white/10 px-4 py-3">
                  {activeSubscription.price?.id ? (
                    <>
                      <div className="text-xs uppercase tracking-wide text-white/60">{t.changePlan}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="w-64"
                          value={priceInputs[activeSubscription.id] ?? ''}
                          onChange={(e) =>
                            setPriceInputs((prev) => ({ ...prev, [activeSubscription.id]: e.target.value }))
                          }
                          placeholder={t.changePlanPlaceholder}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChangePrice(activeSubscription.id)}
                          disabled={changeSubscriptionMutation.isPending}
                          className="rounded-full"
                        >
                          {changeSubscriptionMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          {t.update}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                      {t.planChangeUnavailable}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2">
          <CancelMembershipDialog
            translations={cancelTranslations}
            onNotify={onNotify}
            open={cancelDialogOpen}
            onOpenChange={(openState) => setCancelDialogOpen(openState)}
            onCancelled={() => {
              void queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey })
              onCancelled?.()
              setActiveSubId(null)
            }}
          />
          <Button
            variant="secondary"
            onClick={() => setActiveSubId(null)}
            className="border-white/20 bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
