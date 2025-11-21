import type { ApiClient } from './apiClient'
import type {
  SolanaWallet,
  WalletChallengeResponse,
  VerifyWalletResponse,
  WalletListResponse,
} from '../types'

export class SolanaWalletService {
  constructor(private readonly api: ApiClient) {}

  async list(): Promise<SolanaWallet[]> {
    const response = await this.api.get<WalletListResponse | SolanaWallet | { wallet?: SolanaWallet | null } | SolanaWallet[]>(
      '/wallet/solana'
    )

    if (Array.isArray(response)) {
      return response
    }

    if ('wallets' in response && Array.isArray(response.wallets)) {
      return response.wallets
    }

    if ('wallet' in response) {
      return response.wallet ? [response.wallet] : []
    }

    if ('address' in response) {
      return [response as SolanaWallet]
    }

    return []
  }

  async requestChallenge(wallet: string): Promise<WalletChallengeResponse> {
    return this.api.post('/wallet/solana/challenge', {
      body: { wallet } as Record<string, unknown>,
    })
  }

  async verify(
    wallet: string,
    signature: string,
    nonce?: string
  ): Promise<VerifyWalletResponse> {
    const body: Record<string, unknown> = { wallet, signature }
    if (nonce) {
      body.nonce = nonce
    }
    return this.api.post('/wallet/solana/verify', { body })
  }

  async remove(wallet: string): Promise<void> {
    await this.api.delete('/wallet/solana', {
      query: { wallet },
    })
  }
}
