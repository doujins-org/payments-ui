import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import * as Dialog from '@radix-ui/react-dialog'
import { CreditCard, Loader2, X } from 'lucide-react'
import { DirectPayment } from './DirectPayment'
import { QRCodePayment } from './QRCodePayment'
import { PaymentStatus } from './PaymentStatus'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { useSupportedTokens } from '../hooks/useSupportedTokens'
import { usePaymentStore } from '../hooks/usePaymentStore'
import { selectSolanaFlow } from '../state/selectors'

interface SolanaPaymentSelectorProps {
  isOpen: boolean
  priceId: string
  usdAmount: number
  onClose: () => void
  onError?: (error: string) => void
  onSuccess: (result: SubmitPaymentResponse | string) => void
}

export const SolanaPaymentSelector: React.FC<SolanaPaymentSelectorProps> = ({
  isOpen,
  onClose,
  priceId,
  usdAmount,
  onSuccess,
  onError,
}) => {
  const { connected } = useWallet()
  const {
    tab: activeTab,
    status: paymentState,
    error: errorMessage,
    transactionId,
    tokenAmount,
    selectedTokenSymbol,
    setTab,
    setTokenAmount,
    setTransactionId,
    setSelectedTokenSymbol,
    startSolanaPayment,
    confirmSolanaPayment,
    completeSolanaPayment,
    failSolanaPayment,
    resetSolanaPayment,
  } = usePaymentStore(selectSolanaFlow)

  const {
    tokens,
    isLoading: tokensLoading,
    error: tokensError,
  } = useSupportedTokens()

  const selectedToken = useMemo<TokenInfo | null>(() => {
    if (!tokens.length) return null
    const explicit = tokens.find((token) => token.symbol === selectedTokenSymbol)
    return explicit || tokens[0]
  }, [tokens, selectedTokenSymbol])

  useEffect(() => {
    if (!selectedTokenSymbol && tokens.length) {
      const defaultToken =
        tokens.find((token) => token.symbol === 'SOL') || tokens[0]
      setSelectedTokenSymbol(defaultToken.symbol)
    }
  }, [tokens, selectedTokenSymbol, setSelectedTokenSymbol])

  const handlePaymentStart = useCallback(() => {
    startSolanaPayment()
  }, [startSolanaPayment])

  const handlePaymentConfirming = useCallback(() => {
    confirmSolanaPayment()
  }, [confirmSolanaPayment])

  const handlePaymentSuccess = useCallback(
    (result: SubmitPaymentResponse | string, txId?: string) => {
      const resolvedTx = txId ||
        (typeof result === 'string' ? result : result.transaction_id)
      setTransactionId(resolvedTx)
      completeSolanaPayment(
        typeof result === 'string'
          ? {
              transactionId: resolvedTx,
              processor: 'solana',
              metadata: { source: 'solana-pay' },
            }
          : {
              transactionId: result.transaction_id,
              intentId: result.intent_id,
              processor: 'solana',
              metadata: {
                purchaseId: result.purchase_id,
                amount: result.amount,
                currency: result.currency,
              },
            }
      )

      setTimeout(() => {
        onSuccess(result)
      }, 1500)
    },
    [completeSolanaPayment, onSuccess, setTransactionId]
  )

  const handlePaymentError = useCallback(
    (error: string) => {
      failSolanaPayment(error)
      onError?.(error)
    },
    [failSolanaPayment, onError]
  )

  const handleRetry = useCallback(() => {
    resetSolanaPayment()
    setTransactionId(null)
  }, [resetSolanaPayment, setTransactionId])

  const handleClose = useCallback(() => {
    if (paymentState === 'processing' || paymentState === 'confirming') {
      return
    }

    resetSolanaPayment()
    setTransactionId(null)
    onClose()
  }, [paymentState, resetSolanaPayment, setTransactionId, onClose])

  useEffect(() => {
    if (!isOpen || !selectedToken || usdAmount === 0) {
      setTokenAmount(0)
      return
    }

    const price = selectedToken.price ?? 0
    if (!price || price <= 0) {
      setTokenAmount(0)
      return
    }

    setTokenAmount(usdAmount / price)
  }, [isOpen, usdAmount, selectedToken, setTokenAmount])

  const handleTokenChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedTokenSymbol(event.target.value)
    },
    [setSelectedTokenSymbol]
  )

  const wasConnectedRef = useRef(connected)

  useEffect(() => {
    if (connected && !wasConnectedRef.current) {
      setTab('wallet')
    }

    if (!connected && wasConnectedRef.current) {
      setTab('qr')
    }

    wasConnectedRef.current = connected
  }, [connected, setTab])

  const renderSelector = () => {
    if (tokensLoading) {
      return (
        <div className="payments-ui-empty">
          <Loader2 className="payments-ui-spinner" /> Loading tokens…
        </div>
      )
    }

    if (tokensError) {
      return <div className="payments-ui-error">{tokensError}</div>
    }

    if (!tokens.length) {
      return <div className="payments-ui-empty">No payment tokens available.</div>
    }

    return (
      <div className="payments-ui-token-select">
        <label>
          Payment token
          <select value={selectedTokenSymbol ?? ''} onChange={handleTokenChange}>
            {tokens.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.name} ({token.symbol})
              </option>
            ))}
          </select>
        </label>
        <p className="payments-ui-token-meta">
          ≈ {tokenAmount.toFixed(4)} {selectedToken?.symbol}
        </p>
      </div>
    )
  }

  if (paymentState !== 'selecting') {
    return (
      <Dialog.Root open={isOpen} onOpenChange={handleClose}>
        <Dialog.Portal>
          <Dialog.Overlay className="payments-ui-modal-overlay" />
          <Dialog.Content className="payments-ui-modal">
            <div className="payments-ui-modal-header">
              <div>
                <h3>Complete your payment</h3>
                <p>Follow the prompts below to finish.</p>
              </div>
              <Dialog.Close
                className="payments-ui-icon-button"
                disabled={paymentState === 'processing' || paymentState === 'confirming'}
              >
                <X className="payments-ui-icon" />
              </Dialog.Close>
            </div>
            <PaymentStatus
              state={paymentState}
              usdAmount={usdAmount}
              solAmount={tokenAmount}
              onRetry={handleRetry}
              onClose={handleClose}
              errorMessage={errorMessage}
              transactionId={transactionId}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="payments-ui-modal-overlay" />
        <Dialog.Content className="payments-ui-modal">
          <div className="payments-ui-modal-header">
            <div>
              <h3>Complete your payment</h3>
              <p>Select a token and preferred method.</p>
            </div>
            <Dialog.Close className="payments-ui-icon-button">
              <X className="payments-ui-icon" />
            </Dialog.Close>
          </div>

          <div className="payments-ui-tab-header">
            <button
              type="button"
              className={activeTab === 'wallet' ? 'active' : ''}
              onClick={() => setTab('wallet')}
              disabled={!connected}
            >
              Pay with wallet
            </button>
            <button
              type="button"
              className={activeTab === 'qr' ? 'active' : ''}
              onClick={() => setTab('qr')}
            >
              Scan QR
            </button>
          </div>

          {renderSelector()}

          {activeTab === 'wallet' ? (
            <DirectPayment
              priceId={priceId}
              tokenAmount={tokenAmount}
              selectedToken={selectedToken}
              supportedTokens={tokens}
              onPaymentStart={handlePaymentStart}
              onPaymentConfirming={handlePaymentConfirming}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          ) : (
            <QRCodePayment
              priceId={priceId}
              selectedToken={selectedToken}
              onPaymentError={handlePaymentError}
              onPaymentSuccess={handlePaymentSuccess}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
