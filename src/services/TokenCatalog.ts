import type { TokenInfo } from '../types'
import type { SolanaPaymentService } from './SolanaPaymentService'

export interface TokenCatalogOptions {
  ttlMs?: number
}

export class TokenCatalog {
  private cache: TokenInfo[] = []
  private lastFetched = 0

  constructor(
    private solanaService: SolanaPaymentService,
    private options: TokenCatalogOptions = {}
  ) { }

  private get ttl(): number {
    return this.options.ttlMs ?? 5 * 60 * 1000
  }

  async getTokens(force = false): Promise<TokenInfo[]> {
    const isStale = Date.now() - this.lastFetched > this.ttl
    if (!force && this.cache.length > 0 && !isStale) {
      return this.cache
    }

    const tokens = await this.solanaService.fetchSupportedTokens()
    this.cache = tokens
    this.lastFetched = Date.now()
    return tokens
  }

  getCached(): TokenInfo[] {
    return this.cache
  }
}
