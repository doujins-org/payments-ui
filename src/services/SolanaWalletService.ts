import type { ApiClient } from './apiClient'
export class SolanaWalletService {
  constructor(private readonly api: ApiClient) {}

  async list() {
    throw new Error('Solana wallet endpoints are no longer available')
  }

  async requestChallenge() {
    throw new Error('Solana wallet endpoints are no longer available')
  }

  async verify() {
    throw new Error('Solana wallet endpoints are no longer available')
  }

  async remove() {
    throw new Error('Solana wallet endpoints are no longer available')
  }
}
