import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, Loader2, MapPin, User } from 'lucide-react'
import type { BillingDetails } from '../types'
import type { CollectJSResponse } from '../types/collect'
import { usePaymentContext } from '../context/PaymentContext'
import { countries } from '../data/countries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '../lib/utils'
import { defaultBillingDetails } from '../constants/billing'

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
			...defaultBillingDetails,
			...defaultValues,
			email:
				defaultValues?.email ?? config.defaultUser?.email ?? defaultBillingDetails.email,
		}),
		[defaultValuesKey, config.defaultUser?.email]
	)

  const [firstName, setFirstName] = useState(mergedDefaults.firstName)
  const [lastName, setLastName] = useState(mergedDefaults.lastName)
  const [address1, setAddress1] = useState(mergedDefaults.address1)
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
    'flex h-11 w-full items-center rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white'

  return (
    <form
      className={cn('space-y-5', className)}
      onSubmit={handleSubmit}
      noValidate
    >
      {errorMessage && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payments-first" className="flex items-center gap-2 text-white/70">
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
          <Label htmlFor="payments-last" className="flex items-center gap-2 text-white/70">
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
        <Label htmlFor="payments-address1">Address</Label>
        <Input
          id="payments-address1"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
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

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payments-postal" className="flex items-center gap-2 text-white/70">
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
            <SelectContent className="max-h-64 w-full">
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

      <p className="flex items-center gap-2 text-xs text-white/50">
        <CreditCard className="h-4 w-4" /> Your payment information is encrypted and processed securely.
      </p>
    </form>
  )
}
