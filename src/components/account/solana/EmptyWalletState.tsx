import { Wallet } from 'lucide-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export const EmptyWalletState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
    <h3 className="mb-2 text-lg font-medium">No wallets connected</h3>
    <p className="mb-6 text-sm text-muted-foreground">
      Connect your Solana wallet to get started
    </p>
    
    <WalletMultiButton className="!bg-primary text-primary-foreground hover:!bg-primary/90" />
  </div>
)
