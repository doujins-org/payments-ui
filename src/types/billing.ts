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
  object?: string
  type?: string
  processor?: string
  livemode?: boolean
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_active?: boolean
  failure_reason?: string | null
  created_at?: string
  created?: number
  subscriptions?: Array<{
    id: string
    display_name: string
    description?: string
    created_at: string
  }>
}

export interface SubscriptionPrice {
  id: string
  display_name: string
  amount: number
  currency: string
  billing_cycle_days?: number
  processors?: Record<string, unknown>
}

export interface SubscriptionProduct {
  id: string
  slug?: string
  display_name?: string
  description?: string
  tier_group?: string
  tier_rank?: number
  entitlements_spec?: unknown
  credits_spec?: unknown
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'all' | 'pending'

export interface SubscriptionAccess {
  kind: string
  entitlement: string
  processor?: string
  processor_subscription_id?: string
  start_at?: string | null
  end_at?: string | null
}

export interface Subscription {
  id: string
  user_id?: string
  product_id?: string
  price_id?: string
  status: string
  started_at?: string
  current_period_starts_at?: string
  current_period_ends_at?: string
  created_at?: string
  updated_at?: string
  processor?: string
  processor_subscription_id?: string
  payment_method_id?: string
  cancel_feedback?: string | null
  cancel_type?: string | null
  cancelled_at?: string | null
  price?: SubscriptionPrice
  product?: SubscriptionProduct
  access?: SubscriptionAccess
}

export interface PaginatedSubscriptions {
  data: Subscription[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface UpdateSubscriptionPaymentMethodPayload {
  subscription_id: string
  payment_method_id: string
}

export interface UpdateSubscriptionPaymentMethodResponse {
  success?: boolean
  message?: string
  subscription_id: string
  payment_method_id: string
}

export interface ChangeSubscriptionPayload {
  price_id: string
}

export interface ChangeSubscriptionResponse {
  status: string
  action?: 'upgrade' | 'downgrade'
  message?: string
  subscription_id?: string
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
