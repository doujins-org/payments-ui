import type { SolanaWalletSectionProps } from './solana/SolanaWalletSection'
import { SolanaWalletSection } from './solana/SolanaWalletSection'

export const WalletManagement = (props: SolanaWalletSectionProps) => (
  <SolanaWalletSection {...props} />
)
