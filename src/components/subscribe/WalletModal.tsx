import { useState } from 'react'
import { Dialog, DialogContent } from '../../ui/dialog'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
      <DialogContent className="max-w-md border border-border bg-background">
        <div className="space-y-4">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="rounded-lg border border-border/80">
              <button
                className="flex w-full items-center justify-between px-4 py-3"
                onClick={() => setExpandedWallet((prev) => (prev === wallet.id ? null : wallet.id))}
              >
                <div className="flex items-center gap-3 text-left">
                  <img src={wallet.icon} alt={wallet.name} className="h-8 w-8 rounded-full" />
                  <div>
                    <p className="font-semibold">{wallet.name}</p>
                    <p className="text-sm text-muted-foreground">Connect via browser extension</p>
                  </div>
                </div>
                {expandedWallet === wallet.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedWallet === wallet.id && (
                <div className="border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
                  Follow the prompts in your {wallet.name} wallet to approve access.
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
