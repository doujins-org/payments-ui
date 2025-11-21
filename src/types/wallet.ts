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
