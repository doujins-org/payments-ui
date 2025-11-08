import type {
  GeneratePaymentResponse,
  SubmitPaymentResponse,
  TokenInfo,
} from '../types'
import type { ApiClient } from './apiClient'

export class SolanaPaymentService {
  constructor(private api: ApiClient) { }

  async generatePayment(
    priceId: string,
    token: string,
    userWallet: string
  ): Promise<GeneratePaymentResponse> {
    return this.api.post('/solana/generate', {
      body: { price_id: priceId, token, user_wallet: userWallet },
    })
  }

  async submitPayment(
    signedTransaction: string,
    priceId: string,
    intentId: string,
    memo?: string
  ): Promise<SubmitPaymentResponse> {
    return this.api.post('/solana/submit', {
      body: {
        signed_transaction: signedTransaction,
        price_id: priceId,
        intent_id: intentId,
        ...(memo ? { memo } : {}),
      },
    })
  }

  async fetchSupportedTokens(): Promise<TokenInfo[]> {
    const response = await this.api.get<{ tokens: TokenInfo[] }>(
      '/solana/tokens'
    )
    return response.tokens
  }

  async getSupportedTokens(): Promise<TokenInfo[]> {
    return this.fetchSupportedTokens()
  }

  async generateQrCode(
    priceId: string,
    token: string,
    userWallet?: string
  ): Promise<unknown> {
    return this.api.post('/solana/qr', {
      body: {
        price_id: priceId,
        token,
        ...(userWallet ? { user_wallet: userWallet } : {}),
      },
    })
  }

  async generateQRCode(
    priceId: string,
    token: string,
    userWallet?: string
  ): Promise<unknown> {
    return this.generateQrCode(priceId, token, userWallet)
  }

  async checkPaymentStatus(reference: string, memo?: string): Promise<unknown> {
    return this.api.get('/solana/check', {
      query: {
        reference,
        ...(memo ? { memo } : {}),
      },
    })
  }
}
