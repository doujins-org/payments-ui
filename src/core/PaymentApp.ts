import { EventEmitter } from './EventEmitter'
import { ServiceContainer, ServiceToken } from './ServiceContainer'
import type { PaymentConfig, PaymentFetcher } from '../types'

export interface PaymentAppOptions {
  config: PaymentConfig
  fetcher?: PaymentFetcher
}

export class PaymentApp {
  private readonly config: PaymentConfig
  private readonly fetcher: PaymentFetcher
  private readonly events = new EventEmitter()
  private readonly services = new ServiceContainer()

  constructor(options: PaymentAppOptions) {
    this.config = options.config
    this.fetcher =
      options.fetcher ??
      options.config.fetcher ??
      (globalThis.fetch?.bind(globalThis) as PaymentFetcher)

    if (!this.fetcher) {
      throw new Error('payments-ui: fetch implementation is required')
    }

    // Expose core singletons through the registry for downstream services
    this.services.set('events' as ServiceToken<EventEmitter>, this.events)
    this.services.set('config' as ServiceToken<PaymentConfig>, this.config)
    this.services.set('fetcher' as ServiceToken<PaymentFetcher>, this.fetcher)
  }

  getConfig(): PaymentConfig {
    return this.config
  }

  getFetcher(): PaymentFetcher {
    return this.fetcher
  }

  getEvents(): EventEmitter {
    return this.events
  }

  getServices(): ServiceContainer {
    return this.services
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
