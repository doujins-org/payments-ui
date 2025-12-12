import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table'
import { Card, CardContent, CardDescription, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { cn } from '../../lib/utils'
import { usePaymentContext } from '../../context/PaymentContext'
import type { NotificationHandler, NotificationPayload, PaginatedPayments } from '../../types'
import { CancelMembershipDialog } from './CancelMembershipDialog'

export interface BillingHistoryProps {
  pageSize?: number
  initialPage?: number
  enableCancel?: boolean
  onNotify?: NotificationHandler
}

const notifyDefault = (payload: NotificationPayload) => {
  const level = payload.status === 'destructive' ? 'error' : 'info'
  console[level === 'error' ? 'error' : 'log']('[payments-ui] billing', payload)
}

export const BillingHistory: React.FC<BillingHistoryProps> = ({
  pageSize = 10,
  initialPage = 1,
  enableCancel = true,
  onNotify,
}) => {
  const { client } = usePaymentContext()
  const notify = onNotify ?? notifyDefault
  const [isExpanded, setIsExpanded] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const historyQuery = useInfiniteQuery<PaginatedPayments, Error, PaginatedPayments, ['payments-ui', 'billing-history', number], number>({
    queryKey: ['payments-ui', 'billing-history', pageSize],
    queryFn: async ({ pageParam = initialPage }) => {
      const offset = (pageParam - 1) * pageSize
      return client.getPaymentHistory({ limit: pageSize, offset, type: undefined }).then(
        (response) => ({
          data: response.data,
          total_items: response.total,
          limit: response.limit,
          offset: response.offset,
          page: response.limit > 0 ? Math.floor(response.offset / response.limit) + 1 : 1,
          page_size: response.limit,
          total_pages:
            response.limit > 0 ? Math.ceil(response.total / response.limit) : undefined,
        })
      )
    },
    initialPageParam: initialPage,
    getNextPageParam: (lastPage) => {
      const nextOffset = (lastPage.offset ?? 0) + lastPage.data.length
      if (lastPage.total_items <= nextOffset) {
        return undefined
      }
      return lastPage.page ? lastPage.page + 1 : initialPage + 1
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!loadMoreRef.current || !isExpanded) return

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry?.isIntersecting && historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
        historyQuery.fetchNextPage().catch(() => {
          notify({ title: 'Failed to load more history', status: 'destructive' })
        })
      }
    })

    observerRef.current.observe(loadMoreRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [historyQuery, isExpanded, notify])

  const payments = useMemo<PaginatedPayments[]>(() => {
    const data = historyQuery.data as InfiniteData<PaginatedPayments> | undefined
    return data?.pages ?? []
  }, [historyQuery.data])

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount)
    } catch {
      return `${amount.toFixed(2)} ${currency}`
    }
  }

  return (
    <Card className="border-0 bg-background/5 shadow-lg">
      <div className="p-4 sm:p-6">
        <div className="flex cursor-pointer items-center justify-between" onClick={() => setIsExpanded((prev) => !prev)}>
          <div>
            <CardTitle className="text-xl font-semibold">Transaction History</CardTitle>
            <CardDescription>Record of billing history</CardDescription>
          </div>
          <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
        </div>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isExpanded ? 'mt-4 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <CardContent className="p-0 pt-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground">Review your account activity below</p>
                {enableCancel && <CancelMembershipDialog onNotify={notify} />}
              </div>

              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/70">
                <div className="overflow-x-auto">
                  {historyQuery.isLoading ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>
                  ) : historyQuery.isError ? (
                    <p className="p-4 text-center text-sm text-destructive">Error loading billing history.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/60">
                          <TableHead>Reference</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Processor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((page) =>
                          page.data.map((payment) => (
                            <TableRow key={payment.id} className="border-border/40">
                              <TableCell className="font-mono text-sm">
                                {payment.id.slice(0, 7).toUpperCase()}
                              </TableCell>
                              <TableCell>{formatDate(payment.purchased_at)}</TableCell>
                              <TableCell>{formatAmount(payment.amount, payment.currency)}</TableCell>
                              <TableCell className="capitalize">{payment.processor}</TableCell>
                              <TableCell>
                                <Badge className="bg-emerald-500/10 text-emerald-400">
                                  {(payment.status || 'completed').toLowerCase()}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              <div ref={loadMoreRef} className="h-10 w-full">
                {historyQuery.isFetchingNextPage && (
                  <p className="text-center text-sm text-muted-foreground">Loading more...</p>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  )
}
