export type AuthTokenProvider =
  | (() => string | null | undefined)
  | (() => Promise<string | null | undefined>)
  | null
  | undefined

export interface PaymentUserDetails {
  userId?: string
  email?: string
  firstName?: string
  lastName?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export interface PaymentEndpoints {
  billingBaseUrl: string
  accountBaseUrl?: string
  billingBasePath?: string
  accountBasePath?: string
}

export interface PaymentFeatureFlags {
  enableCardPayments?: boolean
  enableStoredMethods?: boolean
  enableSolanaPay?: boolean
  enableDirectWallet?: boolean
}

export interface PaymentSolanaConfig {
  endpoint?: string
  network?: import('@solana/wallet-adapter-base').WalletAdapterNetwork
  autoConnect?: boolean
  wallets?: import('@solana/wallet-adapter-base').WalletAdapter[]
}

export interface PaymentCallbacks {
  onStatusChange?: (payload: PaymentStatusPayload) => void
  onSuccess?: (payload: PaymentSuccessPayload) => void
  onError?: (error: Error | string) => void
}

export interface PaymentStatusPayload {
  status: 'idle' | 'collecting' | 'processing' | 'pending' | 'success' | 'error'
  context?: Record<string, unknown>
}

export interface PaymentSuccessPayload {
  intentId?: string
  transactionId?: string
  processor?: string
  metadata?: Record<string, unknown>
}

export type PaymentFetcher = (
  input: RequestInfo,
  init?: RequestInit
) => Promise<Response>

export interface PaymentConfig {
  endpoints: PaymentEndpoints
  getAuthToken?: AuthTokenProvider
  fetcher?: PaymentFetcher
  defaultHeaders?: Record<string, string>
  features?: PaymentFeatureFlags
  defaultUser?: PaymentUserDetails
  callbacks?: PaymentCallbacks
  collectJsKey?: string
  solanaRpcUrl?: string
  solana?: PaymentSolanaConfig
}

export type NotificationStatus = 'default' | 'success' | 'info' | 'destructive'

export interface NotificationPayload {
  title: string
  description?: string
  status?: NotificationStatus
}

export type NotificationHandler = (payload: NotificationPayload) => void
