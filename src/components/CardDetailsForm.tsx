import React, { useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import type { BillingDetails } from '../types'
import type { CollectJSResponse } from '../types/collect'
import { usePaymentContext } from '../context/PaymentContext'
import { countries } from '../data/countries'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { cn } from '../lib/utils'
import { collectCssConfig, waitForCollectJs } from '../utils/collect'
import { defaultBillingDetails } from '../constants/billing'

export interface CardDetailsFormTranslations {
  firstName?: string
  lastName?: string
  email?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  cardNumber?: string
  expiry?: string
  cvv?: string
  submit?: string
  processing?: string
  errorRequiredFields?: string
  errorTokenization?: string
  errorFormNotReady?: string
  infoSecure?: string
  cancel?: string
  editEmail?: string
  selectCountry?: string
}

export const defaultCardDetailsFormTranslations: Required<CardDetailsFormTranslations> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  address: 'Address',
  city: 'City',
  state: 'State / Region',
  postalCode: 'Postal code',
  country: 'Country',
  cardNumber: 'Card number',
  expiry: 'Expiry',
  cvv: 'CVV',
  submit: 'Submit',
  processing: 'Processing…',
  errorRequiredFields: 'Please complete all required billing fields.',
  errorTokenization: 'Payment tokenization failed. Please try again.',
  errorFormNotReady: 'Payment form is not ready. Please try again later.',
  infoSecure: 'Your payment information is encrypted and processed securely.',
  cancel: 'Cancel',
  editEmail: 'Edit email',
  selectCountry: 'Select a country',
}


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
  translations?: CardDetailsFormTranslations
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
  translations,
}) => {
    const t = { ...defaultCardDetailsFormTranslations, ...translations }
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
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isTokenizing, setIsTokenizing] = useState(false)
  const [collectReady, setCollectReady] = useState(
    typeof window !== 'undefined' && Boolean(window.CollectJS)
  )

  useEffect(() => {
    if (collectReady) return
    let active = true
    waitForCollectJs().then((instance) => {
      if (active && instance) {
        setCollectReady(true)
      }
    })
    
    return () => { active = false }
  }, [collectReady])

  useEffect(() => {
    if (!visible) {
      setLocalError(null)
      setIsTokenizing(false)
      // Reset CollectJS configured flag for this prefix so fields reload on next open
      if (typeof window !== 'undefined' && window.__doujinsCollectConfigured && collectPrefix) {
        window.__doujinsCollectConfigured[collectPrefix] = false
      }
    }
  }, [visible, collectPrefix])

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

  const sanitizeCollectField = (field: { selector: string; [key: string]: unknown }) => {
    const sanitized = { ...field }
    if ('style_input' in sanitized || 'style_placeholder' in sanitized) {
      delete sanitized.style_input
      delete sanitized.style_placeholder
      if (typeof window !== 'undefined') {
        console.warn(
          '[payments-ui] stripping unsupported Collect.js style fields',
          Object.keys(field).filter((key) => key.startsWith('style_'))
        )
      }
    }
    return sanitized
  }

  useEffect(() => {
    if (!collectReady || typeof window === 'undefined' || !window.CollectJS || !visible) {
      return
    }

    const handlers = (window.__doujinsCollectHandlers ||= {})
    handlers[collectPrefix] = (response: CollectJSResponse) => {
      setIsTokenizing(false)
      if (!response.token) {
        setLocalError('Payment tokenization failed. Please try again.')
        return
      }

      // Format expiry date from MMYY to MM/YY
      let rawExp = response.card?.exp as string
      let formattedExp = rawExp && rawExp.length === 4 ? `${rawExp.slice(0,2)}/${rawExp.slice(2)}` : rawExp
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
        last_four: response.card?.number as string,
        card_type: response.card?.type as string,
        expiry_date: formattedExp,
      }

      onTokenize(response.token, billing)
    }

    const configured = (window.__doujinsCollectConfigured ||= {})
    if (!configured[collectPrefix]) {
      window.CollectJS.configure({
        variant: 'inline',
        customCss: collectCssConfig.customCss,
        focusCss: collectCssConfig.focusCss,
        invalidCss: collectCssConfig.invalidCss,
        placeholderCss: collectCssConfig.placeholderCss,
        fields: {
          ccnumber: sanitizeCollectField({ selector: buildSelector(collectPrefix, 'ccnumber') }),
          ccexp: sanitizeCollectField({ selector: buildSelector(collectPrefix, 'ccexp') }),
          cvv: sanitizeCollectField({ selector: buildSelector(collectPrefix, 'cvv') }),
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
    collectReady,
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
      setLocalError(t.errorRequiredFields)
      return false
    }
    setLocalError(null)
    return true
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    if (!window.CollectJS) {
      setLocalError(t.errorFormNotReady)
      return
    }
    setIsTokenizing(true)
    window.CollectJS.startPaymentRequest()
  }

  const errorMessage = localError ?? externalError
  const collectFieldClass =
    'relative flex h-9 w-full items-center overflow-hidden rounded-md border border-white/30 bg-transparent px-3 text-sm text-foreground'

  // Check if email is provided via defaultValues or config
  const hasDefaultEmail = Boolean(defaultValues?.email || config.defaultUser?.email)
  const showEmailInput = !hasDefaultEmail || isEditingEmail

  return (
    <form
      className={cn('space-y-2', className)}
      onSubmit={handleSubmit}
      noValidate
    >
      {errorMessage && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="flex-1 space-y-2">
          <Label htmlFor="firstName">{t.firstName}</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <div className="flex-1 space-y-2">
          <Label htmlFor="lastName">{t.lastName}</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t.email}</Label>
        {showEmailInput ? (
          <div className="flex gap-2 items-center">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            {hasDefaultEmail && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsEditingEmail(false)
                  setEmail(mergedDefaults.email ?? '')
                }}
                className="px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                {t.cancel}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between h-9 w-full rounded-md border border-white/30 bg-transparent px-3 text-sm text-foreground">
            <span>{email}</span>
            <button
              type="button"
              onClick={() => setIsEditingEmail(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t.editEmail}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address1">{t.address}</Label>
        <Input
          id="address1"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">{t.city}</Label>
          <Input
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">{t.state}</Label>
          <Input
            id="state"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="postal">{t.postalCode}</Label>
          <Input
            id="postal"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>{t.country}</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger>
              <SelectValue placeholder={t.selectCountry} />
            </SelectTrigger>
            <SelectContent>
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
        <Label>{t.cardNumber}</Label>
        <div id={buildSelector(collectPrefix, 'ccnumber').slice(1)} className={collectFieldClass} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t.expiry}</Label>
          <div id={buildSelector(collectPrefix, 'ccexp').slice(1)} className={collectFieldClass} />
        </div>
        <div className="space-y-2">
          <Label>{t.cvv}</Label>
          <div id={buildSelector(collectPrefix, 'cvv').slice(1)} className={collectFieldClass} />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full border-0 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
        disabled={submitting || submitDisabled || isTokenizing}
      >
        {submitting || isTokenizing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t.processing}
          </>
        ) : (
          submitLabel || t.submit
        )}
      </Button>

      <p className="text-xs text-white/60">
        {t.infoSecure}
      </p>
    </form>
  )
}
