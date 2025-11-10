import { PublicKey } from '@solana/web3.js'

export interface GeneratePaymentRequest {
  price_id: string
  token: string
  user_wallet: string
}

export interface GeneratePaymentResponse {
  transaction: string
  amount: number
  currency: string
  token_amount: number
  token_symbol: string
  expires_at: number
  instructions: string
  intent_id: string
}

export interface SubmitPaymentRequest {
  signed_transaction: string
  price_id: string
  intent_id: string
  memo?: string // Optional memo
}

export interface SubmitPaymentResponse {
  purchase_id: string
  transaction_id: string // Solana signature
  status: 'confirmed' | 'pending' | 'failed'
  amount: number
  currency: string
  processed_at: string
  message: string
  intent_id: string
}

export interface PaymentStatusResponse {
  purchase_id: string
  transaction_id: string
  status: 'confirmed' | 'pending' | 'failed'
  amount: number
  currency: string
  created_at: string
  confirmed_at?: string
}

export interface SolanaPayQRCodeIntent {
  url: string
  amount: number
  token_amount: string
  token_symbol: string
  label: string
  message: string
  expires_at: number
  reference: string
  intent_id: string
}

export interface SolanaPayStatusResponse {
  status: 'confirmed' | 'pending' | 'failed'
  payment_id: string
  transaction?: string | null
  error_message?: string
  intent_id?: string
}

export interface SupportedTokensResponse {
  tokens: TokenInfo[]
}

export interface TokenInfo {
  name: string
  mint: string
  symbol: string
  decimals: number
  price: number
  is_native?: boolean
}

// Frontend payment state types
export interface PaymentState {
  step: PaymentStep
  selectedToken: TokenInfo | null
  amount: number
  tokenAmount: string
  transaction: string | null
  transactionId: string | null
  intentId: string | null
  error: string | null
  isLoading: boolean
  expiresAt: number | null
  instructions?: string
}

export type PaymentStep =
  | 'select-token'
  | 'review-payment'
  | 'sign-transaction'
  | 'submitting'
  | 'confirming'
  | 'success'
  | 'error'

export interface TokenBalance {
  token: TokenInfo
  balance: number
  uiAmount: number // Balance in human-readable format
  hasBalance: boolean
}

export interface PaymentError {
  code: string
  message: string
  details?: string
  retryable: boolean
}

// Payment flow configuration
export interface SolanaFlowConfig {
  priceId: string
  usdAmount: number
  supportedTokens: TokenInfo[]
  userWallet: PublicKey
  onSuccess: (result: SubmitPaymentResponse) => void
  onError: (error: PaymentError) => void
  onCancel: () => void
}

// Transaction monitoring
export interface TransactionStatus {
  signature: string
  confirmationStatus: 'processed' | 'confirmed' | 'finalized' | 'failed'
  confirmations: number
  slot?: number
  blockTime?: number
  error?: string
}

// Solana Pay specific types
export interface SolanaPayTransaction {
  transaction: string
  message: string
  label?: string
  memo?: string
}

// Payment method types
export type SolanaPaymentMethod = 'traditional' | 'solana-pay'

export interface PaymentMethodOption {
  id: SolanaPaymentMethod
  name: string
  description: string
  icon: string
  enabled: boolean
  requiresWallet: boolean
}
