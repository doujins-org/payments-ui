import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, Loader2, MapPin, User } from 'lucide-react'
import type { BillingDetails } from '../types'
import type { CollectJSResponse } from '../types/collect'
import { usePaymentContext } from '../context/PaymentContext'
import { countries } from '../data/countries'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { cn } from '../lib/utils'

export interface CardDetailsFormProps {
  visible: boolean
  onTokenize: (token: string, billing: BillingDetails) => void
  submitLabel: string
  submitting?: boolean
  defaultValues?: Partial<BillingDetails>
  externalError?: string | null
  collectPrefix?: string
  className?: string
  onBillingChange?: (billing: BillingDetails) => void
  submitDisabled?: boolean
}

const defaultBilling: BillingDetails = {
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: 'US',
  email: '',
  provider: 'mobius',
}

const buildSelector = (prefix: string, field: string) => `#${prefix}-${field}`

export const CardDetailsForm: React.FC<CardDetailsFormProps> = ({
  visible,
  onTokenize,
  submitLabel,
  submitting = false,
  defaultValues,
  externalError,
  collectPrefix = 'card-form',
  className,
  onBillingChange,
  submitDisabled = false,
}) => {
  const { config } = usePaymentContext()
  const defaultValuesKey = useMemo(() => JSON.stringify(defaultValues ?? {}), [defaultValues])

  const mergedDefaults: BillingDetails = useMemo(
    () => ({
      ...defaultBilling,
      ...defaultValues,
      email: defaultValues?.email ?? config.defaultUser?.email ?? defaultBilling.email,
    }),
    [defaultValuesKey, config.defaultUser?.email]
  )

  const [firstName, setFirstName] = useState(mergedDefaults.firstName)
  const [lastName, setLastName] = useState(mergedDefaults.lastName)
  const [address1, setAddress1] = useState(mergedDefaults.address1)
  const [address2, setAddress2] = useState(mergedDefaults.address2 ?? '')
  const [city, setCity] = useState(mergedDefaults.city)
  const [stateRegion, setStateRegion] = useState(mergedDefaults.stateRegion ?? '')
  const [postalCode, setPostalCode] = useState(mergedDefaults.postalCode)
  const [country, setCountry] = useState(mergedDefaults.country)
  const [email, setEmail] = useState(mergedDefaults.email ?? '')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isTokenizing, setIsTokenizing] = useState(false)

  useEffect(() => {
    if (!visible) {
      setLocalError(null)
      setIsTokenizing(false)
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    setFirstName(mergedDefaults.firstName)
    setLastName(mergedDefaults.lastName)
    setAddress1(mergedDefaults.address1)
    setAddress2(mergedDefaults.address2 ?? '')
    setCity(mergedDefaults.city)
    setStateRegion(mergedDefaults.stateRegion ?? '')
    setPostalCode(mergedDefaults.postalCode)
    setCountry(mergedDefaults.country)
    setEmail(mergedDefaults.email ?? '')
  }, [defaultValuesKey, mergedDefaults, visible])

  useEffect(() => {
    if (!onBillingChange) return
    onBillingChange({
      firstName,
      lastName,
      address1,
      address2,
      city,
      stateRegion,
      postalCode,
      country,
      email,
      provider: mergedDefaults.provider ?? 'mobius',
    })
  }, [
    firstName,
    lastName,
    address1,
    address2,
    city,
    stateRegion,
    postalCode,
    country,
    email,
    mergedDefaults.provider,
    onBillingChange,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.CollectJS || !visible) {
      return
    }

    const handlers = (window.__doujinsCollectHandlers ||= {})
    handlers[collectPrefix] = (response: CollectJSResponse) => {
      setIsTokenizing(false)
      if (!response.token) {
        setLocalError('Payment tokenization failed. Please try again.')
        return
      }

      const billing: BillingDetails = {
        firstName,
        lastName,
        address1,
        address2,
        city,
        stateRegion,
        postalCode,
        country,
        email,
        provider: mergedDefaults.provider ?? 'mobius',
      }

      onTokenize(response.token, billing)
    }

    const configured = (window.__doujinsCollectConfigured ||= {})
    if (!configured[collectPrefix]) {
      window.CollectJS.configure({
        variant: 'inline',
        fields: {
          ccnumber: { selector: buildSelector(collectPrefix, 'ccnumber') },
          ccexp: { selector: buildSelector(collectPrefix, 'ccexp') },
          cvv: { selector: buildSelector(collectPrefix, 'cvv') },
        },
        callback: (response: CollectJSResponse) => {
          const fn = window.__doujinsCollectHandlers?.[collectPrefix]
          fn?.(response)
        },
      })
      configured[collectPrefix] = true
    }
  }, [
    collectPrefix,
    firstName,
    lastName,
    address1,
    address2,
    city,
    stateRegion,
    postalCode,
    country,
    email,
    mergedDefaults.provider,
    onTokenize,
    visible,
  ])

  const validate = (): boolean => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !address1.trim() ||
      !city.trim() ||
      !postalCode.trim() ||
      !country.trim() ||
      !email.trim()
    ) {
      setLocalError('Please complete all required billing fields.')
      return false
    }
    setLocalError(null)
    return true
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    if (!window.CollectJS) {
      setLocalError('Payment form is not ready. Please try again later.')
      return
    }
    setIsTokenizing(true)
    window.CollectJS.startPaymentRequest()
  }

  const errorMessage = localError ?? externalError
  const collectFieldClass =
    'flex h-11 w-full items-center rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 px-3 text-sm text-muted-foreground'

  return (
    <form
      className={cn(className)}
      onSubmit={handleSubmit}
      noValidate
    >
      {errorMessage && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payments-first" className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" /> First name
          </Label>
          <Input
            id="payments-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payments-last" className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" /> Last name
          </Label>
          <Input
            id="payments-last"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payments-email">Email</Label>
        <Input
          id="payments-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payments-address1">Address line 1</Label>
        <Input
          id="payments-address1"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payments-address2">Address line 2 (optional)</Label>
        <Input
          id="payments-address2"
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payments-city">City</Label>
          <Input
            id="payments-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payments-state">State / Region</Label>
          <Input
            id="payments-state"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payments-postal" className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" /> Postal code
          </Label>
          <Input
            id="payments-postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {countries.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Card number</Label>
        <div id={buildSelector(collectPrefix, 'ccnumber').slice(1)} className={collectFieldClass} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Expiry</Label>
          <div id={buildSelector(collectPrefix, 'ccexp').slice(1)} className={collectFieldClass} />
        </div>
        <div className="space-y-2">
          <Label>CVV</Label>
          <div id={buildSelector(collectPrefix, 'cvv').slice(1)} className={collectFieldClass} />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={submitting || submitDisabled || isTokenizing}
      >
        {submitting || isTokenizing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" /> {submitLabel}
          </>
        )}
      </Button>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CreditCard className="h-4 w-4" /> Your payment information is encrypted and processed securely.
      </p>
    </form>
  )
}
