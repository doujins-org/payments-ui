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
}

export interface PaymentMethod {
  id: string
  processor?: string
  brand?: string
  card_type?: string
  last_four?: string
  exp_month?: number
  exp_year?: number
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
