import { useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Checkbox } from '../../ui/checkbox'
import { Label } from '../../ui/label'
import { Shield, CreditCard, Calendar, KeyRound, UserRound } from 'lucide-react'

export interface WalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface WalletFormState {
  nameOnCard: string
  cardNumber: string
  expiration: string
  cvv: string
  termsAccepted: boolean
}

type WalletValidators = {
  [K in keyof WalletFormState]: (value: WalletFormState[K]) => string | undefined
}

const initialState: WalletFormState = {
  nameOnCard: '',
  cardNumber: '',
  expiration: '',
  cvv: '',
  termsAccepted: false,
}

export const WalletDialog: React.FC<WalletDialogProps> = ({ open, onOpenChange }) => {
  const [form, setForm] = useState<WalletFormState>(initialState)
  const [errors, setErrors] = useState<Partial<Record<keyof WalletFormState, string>>>({})

  const validators = useMemo<WalletValidators>(
    () => ({
      nameOnCard: (value) => (!value ? 'Name is required' : undefined),
      cardNumber: (value) =>
        /^\d{16}$/.test(value)
          ? undefined
          : 'Card number must be 16 digits',
      expiration: (value) =>
        /^(0[1-9]|1[0-2])\/([2-9]\d)$/.test(value)
          ? undefined
          : 'Must be in MM/YY format',
      cvv: (value) => (/^\d{3,4}$/.test(value) ? undefined : 'CVV must be 3 or 4 digits'),
      termsAccepted: (value) => (value ? undefined : 'You must accept the terms'),
    }),
    []
  )

  const updateField = <K extends keyof WalletFormState>(field: K, value: WalletFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value } as WalletFormState))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = () => {
    const next: Partial<Record<keyof WalletFormState, string>> = {}
    ;(Object.keys(validators) as Array<keyof WalletFormState>).forEach((key) => {
      const validator = validators[key] as (value: WalletFormState[keyof WalletFormState]) => string | undefined
      const message = validator?.(form[key])
      if (message) {
        next[key] = message
      }
    })
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) return
    console.log('[payments-ui] wallet dialog submit', form)
    onOpenChange(false)
    setForm(initialState)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[95vh] max-w-lg overflow-y-auto rounded-2xl border border-border bg-background">
        <AlertDialogHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <AlertDialogTitle className="text-center text-base font-semibold uppercase tracking-wide">
              Secure Payment via Mobius Pay
            </AlertDialogTitle>
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            $23 USD per month, cancel at any time.
          </p>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-2 py-4 sm:px-4">
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block text-sm text-muted-foreground">Name on Card</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </span>
                <Input value={form.nameOnCard} onChange={(e) => updateField('nameOnCard', e.target.value)} className="pl-10" />
              </div>
              {errors.nameOnCard && <p className="mt-1 text-xs text-destructive">{errors.nameOnCard}</p>}
            </div>

            <div>
              <Label className="mb-1 block text-sm text-muted-foreground">Credit Card Number</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                </span>
                <Input value={form.cardNumber} onChange={(e) => updateField('cardNumber', e.target.value)} className="pl-10" />
              </div>
              {errors.cardNumber && <p className="mt-1 text-xs text-destructive">{errors.cardNumber}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <Label className="mb-1 block text-sm text-muted-foreground">Expiration</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <Input value={form.expiration} onChange={(e) => updateField('expiration', e.target.value)} className="pl-10" placeholder="MM/YY" />
                </div>
                {errors.expiration && <p className="mt-1 text-xs text-destructive">{errors.expiration}</p>}
              </div>
              <div className="flex-1">
                <Label className="mb-1 block text-sm text-muted-foreground">CVV</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <Input value={form.cvv} onChange={(e) => updateField('cvv', e.target.value)} className="pl-10" />
                </div>
                {errors.cvv && <p className="mt-1 text-xs text-destructive">{errors.cvv}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/10 p-4">
            <Checkbox id="terms-agree" checked={form.termsAccepted} onCheckedChange={(checked) => updateField('termsAccepted', Boolean(checked))} />
            <Label htmlFor="terms-agree" className="text-sm text-muted-foreground">
              By completing this order, I confirm that I am 18 years or older and agree to your privacy policy and terms.
            </Label>
          </div>
          {errors.termsAccepted && <p className="text-xs text-destructive">{errors.termsAccepted}</p>}

          <AlertDialogFooter className="flex gap-2">
            <Button type="submit" className="flex-1">
              Subscribe
            </Button>
            <AlertDialogCancel asChild>
              <Button variant="outline" className="flex-1">
                Close
              </Button>
            </AlertDialogCancel>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
