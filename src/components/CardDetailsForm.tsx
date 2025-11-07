import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, Loader2, MapPin, User, Search, ChevronDown } from 'lucide-react'
import { useCountryDropdown } from '../hooks/useCountryDropdown'
import type { BillingDetails } from '../types'
import type { CollectJSResponse } from '../types/collect'
import { usePaymentContext } from '../context/PaymentContext'
import clsx from 'clsx'

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

  const {
    countryDropdownRef,
    countryOpen,
    setCountryOpen,
    countrySearch,
    setCountrySearch,
    filteredCountries,
  } = useCountryDropdown()

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

  return (
    <form
      className={clsx('payments-ui-card-form', className)}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="payments-ui-grid">
        <label className="payments-ui-label">
          <span>
            <User className="payments-ui-icon" /> First name
          </span>
          <input
            className="payments-ui-input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label className="payments-ui-label">
          <span>
            <User className="payments-ui-icon" /> Last name
          </span>
          <input
            className="payments-ui-input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="payments-ui-label">
        <span>Email</span>
        <input
          type="email"
          className="payments-ui-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="payments-ui-label">
        <span>Address line 1</span>
        <input
          className="payments-ui-input"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          required
        />
      </label>

      <label className="payments-ui-label">
        <span>Address line 2 (optional)</span>
        <input
          className="payments-ui-input"
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
        />
      </label>

      <div className="payments-ui-grid">
        <label className="payments-ui-label">
          <span>City</span>
          <input
            className="payments-ui-input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </label>
        <label className="payments-ui-label">
          <span>State / Region</span>
          <input
            className="payments-ui-input"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
          />
        </label>
      </div>

      <div className="payments-ui-grid">
        <label className="payments-ui-label">
          <span>
            <MapPin className="payments-ui-icon" /> Postal code
          </span>
          <input
            className="payments-ui-input"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
          />
        </label>
        <div className="payments-ui-label">
          <span>Country</span>
          <div className="payments-ui-country" ref={countryDropdownRef}>
            <button
              type="button"
              className="payments-ui-country-toggle"
              onClick={() => setCountryOpen((prev) => !prev)}
            >
              <span>{country}</span>
              <ChevronDown className="payments-ui-icon" />
            </button>
            {countryOpen && (
              <div className="payments-ui-country-menu">
                <div className="payments-ui-country-search">
                  <Search className="payments-ui-icon" />
                  <input
                    placeholder="Search country"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                  />
                </div>
                <ul>
                  {filteredCountries.map((option) => (
                    <li key={option.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setCountry(option.code)
                          setCountryOpen(false)
                        }}
                      >
                        {option.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="payments-ui-label">
        <span>Card number</span>
        <div
          id={buildSelector(collectPrefix, 'ccnumber').slice(1)}
          className="payments-ui-collect-field"
        />
      </div>

      <div className="payments-ui-grid">
        <div className="payments-ui-label">
          <span>Expiry</span>
          <div
            id={buildSelector(collectPrefix, 'ccexp').slice(1)}
            className="payments-ui-collect-field"
          />
        </div>
        <div className="payments-ui-label">
          <span>CVV</span>
          <div
            id={buildSelector(collectPrefix, 'cvv').slice(1)}
            className="payments-ui-collect-field"
          />
        </div>
      </div>

      {errorMessage && <p className="payments-ui-error">{errorMessage}</p>}

      <button
        type="submit"
        className="payments-ui-button"
        disabled={submitting || isTokenizing || submitDisabled}
      >
        {(submitting || isTokenizing) && (
          <Loader2 className="payments-ui-spinner" />
        )}
        <CreditCard className="payments-ui-icon" />
        {submitting || isTokenizing ? 'Processing...' : submitLabel}
      </button>
    </form>
  )
}
