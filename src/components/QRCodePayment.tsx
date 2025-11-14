import React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import type { SubmitPaymentResponse, TokenInfo } from '../types'
import { useSolanaQrPayment } from '../hooks/useSolanaQrPayment'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

interface QRCodePaymentProps {
  priceId: string
  selectedToken: TokenInfo | null
  onPaymentError: (error: string) => void
  onPaymentSuccess: (result: SubmitPaymentResponse | string, txId: string) => void
}

export const QRCodePayment: React.FC<QRCodePaymentProps> = ({
  priceId,
  selectedToken,
  onPaymentError,
  onPaymentSuccess,
}) => {
  const { intent, qrDataUri, isLoading, error, timeRemaining, refresh } =
    useSolanaQrPayment({
      priceId,
      selectedToken,
      onError: onPaymentError,
      onSuccess: onPaymentSuccess,
    })

  if (!selectedToken) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
        Select a token to continue.
      </div>
    )
  }

  return (
    <Card className="space-y-4 border border-border/60 bg-background/80 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Scan with Solana Pay</p>
          <p className="text-sm text-muted-foreground">
            Use any Solana Pay compatible wallet to scan and confirm.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => refresh()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/5 p-6">
        {qrDataUri ? (
          <img src={qrDataUri} alt="Solana Pay QR" className="h-72 w-72 rounded-lg border border-border/40 bg-card" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Generating QR code…
              </>
            ) : (
              'QR code unavailable'
            )}
          </div>
        )}
      </div>

      {intent && (
        <div className="text-center text-sm text-muted-foreground">
          Expires in {timeRemaining}s · {intent.token_amount} {intent.token_symbol}
        </div>
      )}
    </Card>
  )
}
