import { useMemo } from 'react'
import { usePaymentContext } from '../context/PaymentContext'
import { createApiClient } from './apiClient'

export const useAccountApi = () => {
  const { config, fetcher, resolveAuthToken } = usePaymentContext()
  const baseUrl = config.endpoints.accountBaseUrl ?? config.endpoints.billingBaseUrl

  return useMemo(() => {
    return createApiClient(config, baseUrl, fetcher, resolveAuthToken)
  }, [config, baseUrl, fetcher, resolveAuthToken])
}
