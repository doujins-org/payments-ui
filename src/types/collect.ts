export interface CollectJSConfig {
  variant: 'inline' | string
  fields: Record<string, { selector: string }>
  callback: (response: CollectJSResponse) => void
}

export interface CollectJSResponseCard {
  brand?: string
  expMonth?: string
  expYear?: string
  lastFour?: string
}

export interface CollectJSResponse {
  token?: string
  error?: string
  card?: CollectJSResponseCard
  [key: string]: string | number | boolean | CollectJSResponseCard | undefined
}

export interface CollectJS {
  configure: (config: CollectJSConfig) => void
  startPaymentRequest: () => void
}

declare global {
  interface Window {
    CollectJS?: CollectJS
    __doujinsCollectHandlers?: Record<string, (response: CollectJSResponse) => void>
    __doujinsCollectConfigured?: Record<string, boolean>
  }
}
