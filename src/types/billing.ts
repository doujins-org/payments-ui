export type PaymentPlatform = 'nmi' | 'ccbill'

export type CheckoutStatus = 'success' | 'pending' | 'redirect_required' | 'blocked'

export interface BillingDetails {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  stateRegion?: string
  postalCode: string
  country: string
  email: string
  provider?: string
  last_four?: string
  card_type?: string
  expiry_date?: string
}

export interface PaymentMethod {
  id: string
  processor?: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_active?: boolean
  failure_reason?: string | null
  created_at?: string
}

export interface CreatePaymentMethodPayload {
  payment_token: string
  first_name: string
  last_name: string
  address1: string
  address2?: string
  city: string
  state?: string
  zip: string
  country: string
  email: string
  provider?: string
  last_four?: string
  card_type?: string
  expiry_date?: string
}

export interface PaginatedPaymentMethods {
  data: PaymentMethod[]
  total?: number
  next_page?: number | null
  limit?: number
  offset?: number
}

export interface Payment {
  id: string
  subscription_id?: string | null
  processor: string
  transaction_id: string
  amount: number
  currency: string
  purchased_at: string
  status?: string
  description?: string
}

export interface PaginatedPayments {
  data: Payment[]
  total_items: number
  limit?: number
  offset?: number
  page?: number
  page_size?: number
  total_pages?: number
}

export interface BillingAccessGrant {
  kind: string
  entitlement: string
  subscription_id?: string | null
  processor?: string | null
  processor_subscription_id?: string | null
  source_type?: string | null
  source_id?: string | null
  start_at?: string | null
  end_at?: string | null
}

export interface BillingStatus {
  is_premium: boolean
  access: BillingAccessGrant[]
}

export interface CheckoutResponse {
  status: CheckoutStatus
  message?: string
  subscription_id?: string
  payment_id?: string
  transaction_id?: string
  redirect_url?: string
  delayed_start?: string
}

export interface CheckoutRequestPayload {
  price_id: string
  provider?: string
  payment?: {
    processor: string
    payment_token?: string
    payment_method_id?: string
    email?: string
    first_name?: string
    last_name?: string
    address1?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    last_four?: string
    card_type?: string
    expiry_date?: string
    // Add other payment fields as needed
  }
}

export interface NmiSubscribePayload {
  priceId: string
  paymentToken?: string
  paymentMethodId?: string
  firstName?: string
  lastName?: string
  address1?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  email?: string
  provider?: string
  processor?: string
}

export interface CCBillSubscribePayload {
  priceId: string
  email: string
  firstName: string
  lastName: string
  zipCode: string
  country: string
  processor?: string
}

export interface SubscriptionCheckoutPayload {
  priceId: string
  provider?: string
  processor?: string
  billing: BillingDetails
}

export interface SolanaWallet {
  id: string
  address: string
  is_verified: boolean
  verified_at?: string
  created_at: string
  updated_at?: string
  user_id?: string
}

export interface WalletListResponse {
  wallets: SolanaWallet[]
  count: number
}

export interface WalletChallengeResponse {
  wallet: string
  message: string
  expires_at: number
  nonce: string
}

export interface VerifyWalletResponse {
  verified: boolean
  wallet: string
  verified_at?: string
  linked_wallet?: SolanaWallet
}

export interface WalletConnectionState {
  isConnected: boolean
  isConnecting: boolean
  publicKey: string | null
  wallets: SolanaWallet[]
  isLoading: boolean
  error: string | null
}
