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
  card_type?: string
  last_four?: string
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
}
