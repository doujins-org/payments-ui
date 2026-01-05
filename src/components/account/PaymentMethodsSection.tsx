import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Loader2, Trash2, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CardDetailsForm } from '../CardDetailsForm'
import type {
  BillingDetails,
  CreatePaymentMethodPayload,
  NotificationHandler,
  NotificationPayload,
  PaginatedPaymentMethods,
  PaymentMethod,
} from '../../types'
import { usePaymentContext } from '../../context/PaymentContext'

export interface PaymentMethodsSectionTranslations {
  title?: string
  description?: string
  addCard?: string
  loadingCards?: string
  noPaymentMethods?: string
  addedOn?: string
  active?: string
  inactive?: string
  makeDefault?: string
  defaultMethod?: string
  remove?: string
  addNewCard?: string
  addNewCardDescription?: string
  saveCard?: string
  cardAddedSuccess?: string
  unableToAddCard?: string
  cardRemoved?: string
  unableToRemoveCard?: string
  cardUpdated?: string
  defaultPaymentMethodUpdated?: string
  unableToSetDefault?: string
}

export interface PaymentMethodsSectionProps {
  isAuthenticated?: boolean
  userEmail?: string | null
  provider?: string
  defaultCountry?: string
  collectPrefix?: string
  onNotify?: NotificationHandler
  translations?: PaymentMethodsSectionTranslations
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

const defaultTranslations: Required<PaymentMethodsSectionTranslations> = {
  title: 'Payment Methods',
  description: 'Manage your saved billing cards',
  addCard: 'Add card',
  loadingCards: 'Loading cards...',
  noPaymentMethods: 'No saved payment methods yet.',
  addedOn: 'Added on',
  active: 'Active',
  inactive: 'Inactive',
  makeDefault: 'Make default',
  defaultMethod: 'Default method',
  remove: 'Remove',
  addNewCard: 'Add a new card',
  addNewCardDescription: 'Your card details are tokenized securely via our payment provider.',
  saveCard: 'Save card',
  cardAddedSuccess: 'Card added successfully',
  unableToAddCard: 'Unable to add card',
  cardRemoved: 'Card removed',
  cardUpdated: 'Card updated',
  unableToRemoveCard: 'Unable to remove card',
  defaultPaymentMethodUpdated: 'Default payment method updated',
  unableToSetDefault: 'Unable to set default payment method',
}

export const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({
  isAuthenticated = true,
  userEmail,
  provider = 'mobius',
  defaultCountry = 'US',
  collectPrefix = 'account-card',
  onNotify,
  translations: customTranslations,
}) => {
  const { client } = usePaymentContext()
  const queryClient = useQueryClient()

  // Simple service wrapper for payment methods
  const paymentMethods = {
    list: (params: { pageSize: number }) =>
      client.listPaymentMethods({ limit: params.pageSize }),
    create: (payload: CreatePaymentMethodPayload) => client.createPaymentMethod(payload),
    update: (id: string, payload: CreatePaymentMethodPayload) =>
      client.updatePaymentMethod(id, payload),
    remove: (id: string) => client.deletePaymentMethod(id),
    activate: (id: string) => client.activatePaymentMethod(id),
  }


  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const notify = onNotify ?? notifyDefault
  const t = { ...defaultTranslations, ...customTranslations }

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
      notify({ title: t.cardAddedSuccess, status: 'success' })
      setIsModalOpen(false)
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      notify({
        title: t.unableToAddCard,
        description: error.message,
        status: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (id) => paymentMethods.remove(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      notify({ title: t.cardRemoved, status: 'success' })
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      notify({
        title: t.unableToRemoveCard,
        description: error.message,
        status: 'destructive',
      })
    },
    onSettled: () => setDeletingId(null),
  })


  const activateMutation = useMutation<void, Error, string>({
    mutationFn: (id) => paymentMethods.activate(id),
    onSuccess: () => {
      notify({ title: t.defaultPaymentMethodUpdated, status: 'success' })
      void queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      notify({
        title: t.unableToSetDefault,
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


  return (
    <Card className="border-0 bg-black/30 shadow-2xl backdrop-blur-xl">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {t.title}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>

        <Button onClick={() => setIsModalOpen(true)}>
          <CreditCard className="mr-2 h-4 w-4" /> {t.addCard}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-white/60">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t.loadingCards}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-sm text-center">
            {t.noPaymentMethods}
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((method) => (
              <div
                key={method.id}
                className="rounded-lg border bg-white/5 p-4 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div className="text-base font-medium text-white">
                      {formatCardLabel(method)}
                    </div>

                    <Badge variant={method.is_active ? 'default' : 'secondary'}>
                      {method.is_active ? t.active : t.inactive}
                    </Badge>
                  </div>

                  <div>
                    {method.failure_reason && (
                      <Badge variant="destructive">{method.failure_reason}</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={method.is_active || activateMutation.isPending}
                    onClick={() => activateMutation.mutate(method.id)}
                  >
                    {activateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {method.is_active ? t.defaultMethod : t.makeDefault}
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
                    {t.remove}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className="z-[100] max-w-3xl max-h-[90vh] overflow-y-auto border border-white/20 p-6 backdrop-blur-xl bg-background rounded-md [&::-webkit-scrollbar]:hidden"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">{t.addNewCard}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{t.addNewCardDescription}</DialogDescription>
          </DialogHeader>

          <CardDetailsForm
            visible={isModalOpen}
            submitLabel={t.saveCard}
            collectPrefix={collectPrefix}
            onTokenize={handleCardTokenize}
            submitting={createMutation.isPending}
            defaultValues={{
              provider,
              email: userEmail ?? '',
              country: defaultCountry,
            }}
            externalError={createMutation.error?.message ?? null}
          />
        </DialogContent>
      </Dialog>

    </Card>
  )
}
