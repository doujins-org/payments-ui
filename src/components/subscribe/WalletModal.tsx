import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronUp, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WalletDefinition {
  id: string
  name: string
  icon: string
}

const wallets: WalletDefinition[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: 'https://phantom.app/img/logo.png',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: 'https://solflare.com/favicon.ico',
  },
]

export interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const WalletModal: React.FC<WalletModalProps> = ({ open, onOpenChange }) => {
  const [expandedWallet, setExpandedWallet] = useState<string | null>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-md border bg-background/95 p-0 shadow-2xl [&::-webkit-scrollbar]:hidden">
        <DialogHeader className="border-b bg-gradient-to-r from-primary/10 via-background to-background px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Wallet className="h-5 w-5 text-primary" /> Connect a Solana wallet
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pick a supported wallet to link with Doujins. Verified wallets unlock Solana payments and withdrawals.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-4">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="rounded-2xl border bg-background/80 p-4 shadow-sm"
            >
              <button
                className="flex w-full items-center justify-between"
                onClick={() =>
                  setExpandedWallet((prev) => (prev === wallet.id ? null : wallet.id))
                }
              >
                <div className="flex items-center gap-3 text-left">
                  <img src={wallet.icon} alt={wallet.name} className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="text-base font-semibold text-foreground">{wallet.name}</p>
                    <p className="text-sm text-muted-foreground">Browser extension or mobile app</p>
                  </div>
                </div>
                {expandedWallet === wallet.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedWallet === wallet.id && (
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p>
                    Open the {wallet.name} wallet, approve the connection request, and confirm the signature prompt to finish linking.
                  </p>
                  <Button className="w-full" variant="outline" disabled>
                    Connect with {wallet.name} (coming soon)
                  </Button>
                </div>
              )}
            </div>
          ))}
          <div className="rounded-2xl border bg-muted/10 p-4 text-xs text-muted-foreground">
            Don’t see your wallet? Additional providers will be added soon. Contact support if you need manual verification.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
