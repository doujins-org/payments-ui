import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient, ClientApiError } from './client'

describe('createClient', () => {
  const mockFetch = vi.fn()
  const baseUrl = 'https://billing.example.com'

  beforeEach(() => {
    mockFetch.mockReset()
  })

  const createTestClient = (token?: string) =>
    createClient({
      baseUrl,
      getAuthToken: token ? () => token : undefined,
      fetch: mockFetch as unknown as typeof fetch,
    })

  describe('cancelSubscription', () => {
    it('should call POST /v1/me/subscriptions/:id/cancel with subscriptionId in path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, message: 'Subscription cancelled' }),
      })

      const client = createTestClient('test-token')
      await client.cancelSubscription('sub_123', 'Not using anymore')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://billing.example.com/v1/me/subscriptions/sub_123/cancel')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ feedback: 'Not using anymore' })
    })

    it('should send empty body when no feedback provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const client = createTestClient('test-token')
      await client.cancelSubscription('sub_456')

      const [, options] = mockFetch.mock.calls[0]
      expect(options.body).toBeUndefined()
    })
  })

  describe('resumeSubscription', () => {
    it('should call POST /v1/me/subscriptions/:id/resume with subscriptionId in path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'active' }),
      })

      const client = createTestClient('test-token')
      await client.resumeSubscription('sub_789')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://billing.example.com/v1/me/subscriptions/sub_789/resume')
      expect(options.method).toBe('POST')
    })
  })

  describe('changeSubscription', () => {
    it('should call POST /v1/me/subscriptions/:id/change-tier with subscriptionId in path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'success', action: 'upgrade' }),
      })

      const client = createTestClient('test-token')
      await client.changeSubscription('sub_abc', { price_id: 'price_premium' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://billing.example.com/v1/me/subscriptions/sub_abc/change-tier')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ price_id: 'price_premium' })
    })
  })

  describe('updateSubscriptionPaymentMethod', () => {
    it('should call PUT /v1/me/subscriptions/:id/payment-method with subscriptionId in path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          subscription_id: 'sub_def',
          payment_method_id: 'pm_new',
        }),
      })

      const client = createTestClient('test-token')
      await client.updateSubscriptionPaymentMethod('sub_def', 'pm_new')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://billing.example.com/v1/me/subscriptions/sub_def/payment-method')
      expect(options.method).toBe('PUT')
      expect(JSON.parse(options.body)).toEqual({ payment_method_id: 'pm_new' })
    })

    it('should NOT include subscription_id in the request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          subscription_id: 'sub_test',
          payment_method_id: 'pm_test',
        }),
      })

      const client = createTestClient('test-token')
      await client.updateSubscriptionPaymentMethod('sub_test', 'pm_test')

      const [, options] = mockFetch.mock.calls[0]
      const body = JSON.parse(options.body)
      expect(body).not.toHaveProperty('subscription_id')
      expect(body).toEqual({ payment_method_id: 'pm_test' })
    })
  })

  describe('removed methods', () => {
    it('should not have activatePaymentMethod method', () => {
      const client = createTestClient('test-token')
      expect(client).not.toHaveProperty('activatePaymentMethod')
    })

    it('should not have createSolanaPayIntent method', () => {
      const client = createTestClient('test-token')
      expect(client).not.toHaveProperty('createSolanaPayIntent')
    })

    it('should not have getSolanaPayStatus method', () => {
      const client = createTestClient('test-token')
      expect(client).not.toHaveProperty('getSolanaPayStatus')
    })

    it('should not have getPaymentStatus method', () => {
      const client = createTestClient('test-token')
      expect(client).not.toHaveProperty('getPaymentStatus')
    })
  })

  describe('checkout', () => {
    it('should call POST /v1/checkout with idempotency key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'checkout_123',
          status: 'complete',
        }),
      })

      const client = createTestClient('test-token')
      await client.checkout(
        {
          price_id: 'price_123',
          payment: {
            processor: 'mobius',
            payment_token: 'tok_123',
          },
        },
        'idempotency-key-123'
      )

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://billing.example.com/v1/checkout')
      expect(options.method).toBe('POST')
      expect(options.headers['X-Idempotency-Key']).toBe('idempotency-key-123')
    })
  })

  describe('error handling', () => {
    it('should throw ClientApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Subscription not found' }),
      })

      const client = createTestClient('test-token')

      await expect(client.cancelSubscription('sub_notfound')).rejects.toThrow(ClientApiError)
    })
  })
})
