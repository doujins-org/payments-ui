import type { TokenInfo } from '../types'
import type { SolanaPayQRCodeIntent } from '../types/solana-pay'

interface UseSolanaQrPaymentOptions {
  priceId: string
  selectedToken: TokenInfo | null
  onSuccess: (paymentId: string | undefined, txId: string | undefined) => void
  onError: (error: string) => void
}

interface UseSolanaQrPaymentState {
  intent: SolanaPayQRCodeIntent | null
  qrDataUri: string | null
  isLoading: boolean
  error: string | null
  timeRemaining: number
  refresh: () => void
}

/**
 * @deprecated The standalone Solana Pay QR endpoints have been removed.
 * Use the checkout session flow instead:
 * 1. POST /checkout with processor='solana' to create a checkout session
 * 2. The checkout response includes Solana Pay data
 *
 * This hook is no longer functional and will throw an error if used.
 */
export const useSolanaQrPayment = (
  _options: UseSolanaQrPaymentOptions
): UseSolanaQrPaymentState => {
  throw new Error(
    'useSolanaQrPayment is deprecated. The standalone Solana Pay QR endpoints have been removed. ' +
    'Use the checkout session flow instead: POST /checkout with processor="solana".'
  )
}
