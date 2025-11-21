import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card'
import { Button } from '../../../ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../ui/alert-dialog'
import { useWalletList } from '../../../hooks/useWalletList'
import { useWalletVerification } from '../../../hooks/useWalletVerification'
import { useWalletConnection } from '../../../hooks/useWalletConnection'
import { WalletCard } from './WalletCard'
import { EmptyWalletState } from './EmptyWalletState'
import type { SolanaWallet, NotificationHandler, NotificationPayload } from '../../../types'
import { usePaymentContext } from '../../../context/PaymentContext'

export interface SolanaWalletSectionProps {
  onNotify?: NotificationHandler
  rpcUrl?: string
}

const notifyDefault = (payload: NotificationPayload) => {
  console.log('[payments-ui] solana-wallets', payload)
}

export const SolanaWalletSection: React.FC<SolanaWalletSectionProps> = ({
  onNotify,
  rpcUrl,
}) => {
  const notify = onNotify ?? notifyDefault
  const { config } = usePaymentContext()
  const { connected, publicKey, disconnect } = useWallet()
  const { wallets, isLoading, deleteWallet, fetchWallets } = useWalletList()
  const { signAndVerifyWallet } = useWalletVerification()
  const walletConnection = useWalletConnection()

  const [primaryWalletId, setPrimaryWalletId] = useState<string | null>(null)
  const [showOtherWallets, setShowOtherWallets] = useState(false)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [verifyingWalletId, setVerifyingWalletId] = useState<string | null>(null)
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null)
  const [walletToDelete, setWalletToDelete] = useState<SolanaWallet | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  const rpcEndpoint = rpcUrl || config.solanaRpcUrl || 'https://api.mainnet-beta.solana.com'
  const connection = useMemo(() => new Connection(rpcEndpoint), [rpcEndpoint])

  const primaryWallet =
    wallets.find((w) => w.id === primaryWalletId) ?? wallets.find((w) => w.is_verified) ?? null

  const otherWallets = wallets.filter((w) => w.id !== primaryWallet?.id)

  const fetchBalance = useCallback(
    async (address: string) => {
      try {
        const pubkey = new PublicKey(address)
        const balance = await connection.getBalance(pubkey)
        return balance / LAMPORTS_PER_SOL
      } catch (error) {
        console.error('payments-ui: failed to fetch balance', error)
        return null
      }
    },
    [connection]
  )

  const fetchAllBalances = useCallback(async () => {
    const results = await Promise.all(
      wallets.map(async (wallet) => ({ address: wallet.address, balance: await fetchBalance(wallet.address) }))
    )
    const next: Record<string, number> = {}
    results.forEach(({ address, balance }) => {
      if (balance !== null && typeof balance !== 'undefined') {
        next[address] = balance
      }
    })
    setBalances(next)
  }, [wallets, fetchBalance])

  useEffect(() => {
    if (wallets.length > 0) {
      fetchAllBalances().catch(() => undefined)
    }
  }, [wallets, fetchAllBalances])

  useEffect(() => {
    const verifiedWallet = wallets.find((w) => w.is_verified)
    if (verifiedWallet && !primaryWalletId) {
      setPrimaryWalletId(verifiedWallet.id)
    }
  }, [wallets, primaryWalletId])

  const registerWallet = useCallback(async () => {
    if (!connected || !publicKey || isRegistering) return
    setIsRegistering(true)
    try {
      const challenge = await walletConnection.connectWalletToBackend(publicKey.toBase58())
      if (!challenge?.message) {
        throw new Error('Failed to retrieve wallet verification challenge')
      }
      await signAndVerifyWallet(challenge.wallet, challenge.message, challenge.nonce)
      await fetchWallets()
      notify({
        title: 'Wallet verified',
        description: 'Your wallet has been linked successfully.',
        status: 'success',
      })
    } catch (error) {
      notify({
        title: 'Wallet verification failed',
        description: error instanceof Error ? error.message : 'Failed to verify wallet',
        status: 'destructive',
      })
    } finally {
      setIsRegistering(false)
    }
  }, [connected, publicKey, isRegistering, walletConnection, signAndVerifyWallet, fetchWallets, notify])

  useEffect(() => {
    if (connected && publicKey && !walletConnection.isConnecting && wallets.length === 0) {
      registerWallet().catch(() => undefined)
    }
  }, [connected, publicKey, walletConnection.isConnecting, wallets.length, registerWallet])

  const handleVerifyWallet = useCallback(
    async (wallet: SolanaWallet) => {
      if (!connected || publicKey?.toBase58() !== wallet.address) {
        notify({
          title: 'Connect wallet first',
          description: 'Please connect the wallet you want to verify.',
          status: 'destructive',
        })
        return
      }

      setVerifyingWalletId(wallet.id)
      try {
        const challenge = await walletConnection.connectWalletToBackend(wallet.address)
        if (!challenge?.message) {
          throw new Error('Failed to retrieve verification challenge')
        }
        await signAndVerifyWallet(challenge.wallet, challenge.message, challenge.nonce)
        await fetchWallets()
        notify({ title: 'Wallet verified', status: 'success' })
      } catch (error) {
        notify({
          title: 'Verification failed',
          description: error instanceof Error ? error.message : 'Failed to verify wallet',
          status: 'destructive',
        })
      } finally {
        setVerifyingWalletId(null)
      }
    },
    [connected, publicKey, walletConnection, signAndVerifyWallet, fetchWallets, notify]
  )

  const handleDeleteWallet = useCallback(
    async (walletId: string) => {
      setDeletingWalletId(walletId)
      try {
        await deleteWallet(walletId)
        if (primaryWalletId === walletId) {
          setPrimaryWalletId(null)
        }
        if (connected && publicKey) {
          const deletedWallet = wallets.find((w) => w.id === walletId)
          if (deletedWallet?.address === publicKey.toBase58()) {
            await disconnect()
          }
        }
        notify({ title: 'Wallet removed', status: 'success' })
      } catch (error) {
        notify({
          title: 'Failed to remove wallet',
          description: error instanceof Error ? error.message : 'Please try again',
          status: 'destructive',
        })
      } finally {
        setDeletingWalletId(null)
        setWalletToDelete(null)
      }
    },
    [deleteWallet, primaryWalletId, connected, publicKey, wallets, disconnect, notify]
  )

  const handleSetPrimary = (walletId: string) => {
    setPrimaryWalletId(walletId)
    notify({ title: 'Primary wallet updated', status: 'success' })
  }

  const isWalletRegistered =
    connected && publicKey && wallets.some((w) => w.address === publicKey.toBase58())

  if (isLoading && wallets.length === 0) {
    return (
      <Card className="border-0 bg-background/5">
        <CardHeader>
          <CardTitle className="text-xl">Solana Wallets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading wallets...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 bg-background/5">
        <CardHeader>
          <CardTitle className="text-xl">Solana Wallets</CardTitle>
          <CardDescription>Connect and manage your Solana wallets for payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wallets.length === 0 && !connected ? (
            <EmptyWalletState />
          ) : (
            <>
              {primaryWallet && (
                <div>
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Primary Wallet
                  </h3>
                  <WalletCard
                    wallet={primaryWallet}
                    isPrimary
                    isConnected={connected && publicKey?.toBase58() === primaryWallet.address}
                    balance={balances[primaryWallet.address]}
                    onVerify={handleVerifyWallet}
                    onDelete={(id) => {
                      const target = wallets.find((w) => w.id === id)
                      if (target) setWalletToDelete(target)
                    }}
                    isVerifying={verifyingWalletId === primaryWallet.id}
                    isDeleting={deletingWalletId === primaryWallet.id}
                    notify={notify}
                  />
                </div>
              )}

              {otherWallets.length > 0 && (
                <div>
                  <button
                    className="mb-3 flex w-full items-center justify-between text-left"
                    onClick={() => setShowOtherWallets((prev) => !prev)}
                  >
                    <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                      Other Wallets ({otherWallets.length})
                    </h3>
                    {showOtherWallets ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {showOtherWallets && (
                    <div className="space-y-2">
                      {otherWallets.map((wallet) => (
                        <WalletCard
                          key={wallet.id}
                          wallet={wallet}
                          isConnected={connected && publicKey?.toBase58() === wallet.address}
                          balance={balances[wallet.address]}
                          onSetPrimary={handleSetPrimary}
                          onVerify={handleVerifyWallet}
                          onDelete={(id) => {
                            const target = wallets.find((w) => w.id === id)
                            if (target) setWalletToDelete(target)
                          }}
                          isVerifying={verifyingWalletId === wallet.id}
                          isDeleting={deletingWalletId === wallet.id}
                          notify={notify}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                {connected && publicKey ? (
                  isWalletRegistered ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                        <CheckCircle className="h-4 w-4" /> Connected wallet is verified and linked to your account.
                      </div>
                      <WalletMultiButton className="w-full !bg-primary text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                        Your connected wallet is not registered with your account.
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={registerWallet} disabled={isRegistering || walletConnection.isConnecting} className="flex-1 bg-primary text-primary-foreground">
                          {isRegistering ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...
                            </>
                          ) : (
                            'Register This Wallet'
                          )}
                        </Button>
                        <Button onClick={() => disconnect()} variant="outline" className="border-border">
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <WalletMultiButton className="w-full !bg-primary text-primary-foreground" />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!walletToDelete} onOpenChange={() => setWalletToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this wallet from your account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => walletToDelete && handleDeleteWallet(walletToDelete.id)} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
