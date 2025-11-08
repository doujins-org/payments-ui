export type ServiceFactory<T> = () => T
export type ServiceToken<T> = string & { __type?: T }

export class ServiceContainer {
  private instances = new Map<ServiceToken<unknown>, unknown>()
  private factories = new Map<ServiceToken<unknown>, ServiceFactory<unknown>>()

  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    if (this.factories.has(token)) {
      console.warn(`payments-ui: service ${token} already registered, overwriting`)
    }
    this.factories.set(token, factory as ServiceFactory<unknown>)
  }

  resolve<T>(token: ServiceToken<T>): T {
    if (this.instances.has(token)) {
      return this.instances.get(token) as T
    }

    const factory = this.factories.get(token) as ServiceFactory<T> | undefined
    if (!factory) {
      throw new Error(`payments-ui: no factory registered for token ${token}`)
    }

    const instance = factory()
    this.instances.set(token, instance)
    return instance
  }

  set<T>(token: ServiceToken<T>, instance: T): void {
    this.instances.set(token, instance)
  }

  has(token: ServiceToken<unknown>): boolean {
    return this.instances.has(token) || this.factories.has(token)
  }

  clear(): void {
    this.instances.clear()
    this.factories.clear()
  }
}
