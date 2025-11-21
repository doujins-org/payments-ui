import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  Shield,
  Star,
  Trash2,
} from 'lucide-react'
import { Button } from '../../../ui/button'
import { cn } from '../../../lib/utils'
import type { SolanaWallet } from '../../../types'
import type { NotificationHandler, NotificationPayload } from '../../../types'

interface WalletCardProps {
  wallet: SolanaWallet
  isPrimary?: boolean
  isConnected?: boolean
  balance?: number | null
  onSetPrimary?: (walletId: string) => void
  onVerify?: (wallet: SolanaWallet) => void
  onDelete?: (walletId: string) => void
  isVerifying?: boolean
  isDeleting?: boolean
  notify?: NotificationHandler
}

const notifyDefault = (payload: NotificationPayload) => {
  console.log('[payments-ui] wallet-card', payload)
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  isPrimary = false,
  isConnected = false,
  balance,
  onSetPrimary,
  onVerify,
  onDelete,
  isVerifying = false,
  isDeleting = false,
  notify = notifyDefault,
}) => {
  const [isCopying, setIsCopying] = useState(false)

  const formatAddress = (address: string) =>
    address.length <= 12 ? address : `${address.slice(0, 4)}...${address.slice(-4)}`

  const copyToClipboard = async (text: string) => {
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(text)
      notify({ title: 'Copied', description: 'Wallet address copied to clipboard' })
    } catch (error) {
      notify({ title: 'Failed to copy', description: (error as Error).message, status: 'destructive' })
    } finally {
      setTimeout(() => setIsCopying(false), 500)
    }
  }

  const openExplorer = () => {
    window.open(`https://solscan.io/account/${wallet.address}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-background/40 p-4 transition-shadow',
        isPrimary && 'border-primary/50 shadow-lg',
        isConnected && 'ring-1 ring-primary'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary to-primary/60" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  {formatAddress(wallet.address)}
                </span>
                {isPrimary && (
                  <div className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" /> Primary
                  </div>
                )}
                {wallet.is_verified ? (
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" /> Verified
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" /> Unverified
                  </div>
                )}
                {isConnected && (
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                    Connected
                  </span>
                )}
              </div>
              {balance !== null && typeof balance !== 'undefined' && (
                <p className="mt-1 text-sm text-muted-foreground">Balance: {balance.toFixed(4)} SOL</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                Added {new Date(wallet.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => copyToClipboard(wallet.address)}
            disabled={isCopying}
          >
            {isCopying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openExplorer}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isPrimary && onSetPrimary && wallet.is_verified && (
          <Button
            variant="outline"
            size="sm"
            className="border-primary/40 text-primary"
            onClick={() => onSetPrimary(wallet.id)}
          >
            <Star className="mr-1 h-3 w-3" /> Set Primary
          </Button>
        )}

        {!wallet.is_verified && onVerify && isConnected && (
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/40 text-emerald-400"
            onClick={() => onVerify(wallet)}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <Shield className="mr-1 h-3 w-3" /> Verify
              </>
            )}
          </Button>
        )}

        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-destructive/40 text-destructive"
            onClick={() => onDelete(wallet.id)}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}
