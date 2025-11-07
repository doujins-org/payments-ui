import { useMemo } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import { createApiClient } from './apiClient'

export const useBillingApi = () => {
  const { config, fetcher, resolveAuthToken } = usePaymentContext()

  return useMemo(() => {
    return createApiClient(
      config,
      config.endpoints.billingBaseUrl,
      fetcher,
      resolveAuthToken
    )
  }, [config, fetcher, resolveAuthToken])
}
