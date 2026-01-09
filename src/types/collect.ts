type CollectCssMap = Record<string, string | number>

export interface CollectJSConfig {
  variant: 'inline' | string
  fields: Record<
    string,
    {
      selector: string
      placeholder?: string
    }
  >
  callback: (response: CollectJSResponse) => void
  customCss?: CollectCssMap
  placeholderCss?: CollectCssMap
  focusCss?: CollectCssMap
  invalidCss?: CollectCssMap
  validCss?: CollectCssMap
}

export interface CollectJSResponseCard {
  brand?: string
  type?: string
  number? : string
  expMonth?: string
  expYear?: string
  lastFour?: string
  exp? : string
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
