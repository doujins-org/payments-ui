import type {
  SolanaPayQRCodeIntent,
  SolanaPayStatusResponse,
  TokenInfo,
} from '../types'
import type { ApiClient } from './apiClient'

export class SolanaPaymentService {
  constructor(private api: ApiClient) {}

  async fetchSupportedTokens(): Promise<TokenInfo[]> {
    const response = await this.api.get<{ tokens: TokenInfo[] }>(
      '/solana/tokens'
    )
    return response.tokens
  }

  async generateQRCode(
    priceId: string,
    token: string,
    userWallet?: string
  ): Promise<SolanaPayQRCodeIntent> {
    return this.api.post('/solana/pay', {
      body: {
        price_id: priceId,
        token,
        ...(userWallet ? { user_wallet: userWallet } : {}),
      },
    })
  }

  async getPayStatus(reference: string): Promise<SolanaPayStatusResponse> {
    return this.api.get(`/solana/pay/${reference}`)
  }
}
