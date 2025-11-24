import React, { createContext, useContext, useMemo, useState } from 'react'
import {
  SubscriptionCheckoutModal,
  type SubscriptionCheckoutModalProps,
} from '../components/checkout/SubscriptionCheckoutModal'
import type { SolanaPaymentSelectorProps } from '../components/SolanaPaymentSelector'
import {
  WalletModal,
  type WalletModalProps,
} from '../components/subscribe/WalletModal'

type CheckoutOptions = Omit<SubscriptionCheckoutModalProps, 'open' | 'onOpenChange'>
type SolanaOptions = Omit<SolanaPaymentSelectorProps, 'isOpen' | 'onClose'>
type WalletOptions = Omit<WalletModalProps, 'open' | 'onOpenChange'>

interface DialogState<T> {
  isOpen: boolean
  props: T | null
}

const createDialogState = <T,>(): DialogState<T> => ({
  isOpen: false,
  props: null,
})

interface PaymentsDialogContextValue {
  checkout: {
    open: (options: CheckoutOptions) => void
    close: () => void
    isOpen: boolean
  }
  solana: {
    open: (options: SolanaOptions) => void
    close: () => void
    isOpen: boolean
  }
  wallet: {
    open: (options?: WalletOptions) => void
    close: () => void
    isOpen: boolean
  }
}

const PaymentsDialogContext =
  createContext<PaymentsDialogContextValue | undefined>(undefined)

export const PaymentsDialogProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [checkoutState, setCheckoutState] = useState<DialogState<CheckoutOptions>>(
    () => createDialogState<CheckoutOptions>()
  )
  const [walletState, setWalletState] = useState<DialogState<WalletOptions>>(
    () => createDialogState<WalletOptions>()
  )

  const contextValue = useMemo<PaymentsDialogContextValue>(() => {
    const openCheckout = (options: CheckoutOptions) =>
      setCheckoutState({
        isOpen: true,
        props: options,
      })

    return {
      checkout: {
        isOpen: checkoutState.isOpen,
        open: openCheckout,
        close: () => setCheckoutState(createDialogState<CheckoutOptions>()),
      },
      solana: {
        isOpen:
          checkoutState.isOpen && checkoutState.props?.initialMode === 'solana',
        open: (options) =>
          openCheckout({
            priceId: options.priceId,
            usdAmount: options.usdAmount,
            enableSolanaPay: true,
            initialMode: 'solana',
            onSolanaSuccess: options.onSuccess,
            onSolanaError: options.onError,
          }),
        close: () => setCheckoutState(createDialogState<CheckoutOptions>()),
      },
      wallet: {
        isOpen: walletState.isOpen,
        open: (options) =>
          setWalletState({
            isOpen: true,
            props: options ?? null,
          }),
        close: () => setWalletState(createDialogState<WalletOptions>()),
      },
    }
  }, [checkoutState, walletState.isOpen])

  return (
    <PaymentsDialogContext.Provider value={contextValue}>
      {children}
      {checkoutState.props && (
        <SubscriptionCheckoutModal
          open={checkoutState.isOpen}
          onOpenChange={(open) =>
            open
              ? setCheckoutState((prev) => ({ ...prev, isOpen: true }))
              : setCheckoutState(createDialogState<CheckoutOptions>())
          }
          {...checkoutState.props}
        />
      )}

      <WalletModal
        open={walletState.isOpen}
        onOpenChange={(open) =>
          open
            ? setWalletState((prev) => ({ ...prev, isOpen: true }))
            : setWalletState(createDialogState<WalletOptions>())
        }
        {...(walletState.props ?? {})}
      />
    </PaymentsDialogContext.Provider>
  )
}

export const usePaymentDialogs = (): PaymentsDialogContextValue => {
  const context = useContext(PaymentsDialogContext)
  if (!context) {
    throw new Error('usePaymentDialogs must be used within PaymentProvider')
  }
  return context
}
