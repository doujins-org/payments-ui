import { useMemo } from 'react'
import { useBillingApi } from './useBillingApi'
import type {
  GeneratePaymentResponse,
  SubmitPaymentResponse,
  TokenInfo,
} from '../types'

export const useSolanaService = () => {
  const api = useBillingApi()

  return useMemo(() => ({
    generatePayment: async (
      priceId: string,
      token: string,
      userWallet: string
    ): Promise<GeneratePaymentResponse> => {
      return api.post('/solana/generate', {
        body: {
          price_id: priceId,
          token,
          user_wallet: userWallet,
        },
      })
    },
    submitPayment: async (
      signedTransaction: string,
      priceId: string,
      intentId: string,
      memo?: string
    ): Promise<SubmitPaymentResponse> => {
      return api.post('/solana/submit', {
        body: {
          signed_transaction: signedTransaction,
          price_id: priceId,
          intent_id: intentId,
          ...(memo ? { memo } : {}),
        },
      })
    },
    getSupportedTokens: async (): Promise<TokenInfo[]> => {
      const res = await api.get<{ tokens: TokenInfo[] }>('/solana/tokens')
      return res.tokens
    },
    generateQRCode: async (
      priceId: string,
      token: string,
      userWallet?: string
    ) => {
      return api.post('/solana/qr', {
        body: {
          price_id: priceId,
          token,
          ...(userWallet ? { user_wallet: userWallet } : {}),
        },
      })
    },
    checkPaymentStatus: async (reference: string, memo?: string) => {
      return api.get('/solana/check', {
        query: {
          reference,
          ...(memo ? { memo } : {}),
        },
      })
    },
  }), [api])
}
