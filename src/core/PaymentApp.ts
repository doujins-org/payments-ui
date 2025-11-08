import type { PaymentConfig, PaymentFetcher } from '../types'
import { createApiClient } from '../services/apiClient'
import { CardPaymentService } from '../services/CardPaymentService'
import { PaymentMethodService } from '../services/PaymentMethodService'
import { SolanaPaymentService } from '../services/SolanaPaymentService'
import { TokenCatalog } from '../services/TokenCatalog'
import { WalletGateway } from '../services/WalletGateway'

export interface PaymentServices {
  cardPayments: CardPaymentService
  paymentMethods: PaymentMethodService
  solanaPayments: SolanaPaymentService
  tokenCatalog: TokenCatalog
  walletGateway: WalletGateway
}

export interface PaymentAppOptions {
  config: PaymentConfig
  fetcher?: PaymentFetcher
}

export class PaymentApp {
  private readonly config: PaymentConfig
  private readonly fetcher: PaymentFetcher
  private readonly services: PaymentServices

  constructor(options: PaymentAppOptions) {
    this.config = options.config
    this.fetcher =
      options.fetcher ??
      options.config.fetcher ??
      (globalThis.fetch?.bind(globalThis) as PaymentFetcher)

    if (!this.fetcher) {
      throw new Error('payments-ui: fetch implementation is required')
    }

    this.services = this.createServices()
  }

  getConfig(): PaymentConfig {
    return this.config
  }

  getFetcher(): PaymentFetcher {
    return this.fetcher
  }

  getServices(): PaymentServices {
    return this.services
  }

  private createServices(): PaymentServices {
    const billingApi = createApiClient(
      this.config,
      this.config.endpoints.billingBaseUrl,
      this.fetcher,
      this.resolveAuthToken
    )

    const accountBaseUrl =
      this.config.endpoints.accountBaseUrl ?? this.config.endpoints.billingBaseUrl
    const accountApi = createApiClient(
      this.config,
      accountBaseUrl,
      this.fetcher,
      this.resolveAuthToken
    )

    const solanaPayments = new SolanaPaymentService(billingApi)
    const paymentMethods = new PaymentMethodService(accountApi)
    const cardPayments = new CardPaymentService(this.config)
    const walletGateway = new WalletGateway()
    const tokenCatalog = new TokenCatalog(solanaPayments)

    return {
      cardPayments,
      paymentMethods,
      solanaPayments,
      tokenCatalog,
      walletGateway,
    }
  }

  resolveAuthToken = async (): Promise<string | null> => {
    if (!this.config.getAuthToken) {
      return null
    }

    try {
      const result = this.config.getAuthToken()
      if (result instanceof Promise) {
        return (await result) ?? null
      }
      return result ?? null
    } catch (error) {
      console.warn('payments-ui: failed to resolve auth token', error)
      return null
    }
  }
}
