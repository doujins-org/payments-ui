import { useEffect, useMemo, useState } from 'react'
import type { BillingDetails } from '../types'
import { countries } from '../data/countries'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { defaultBillingDetails } from '../constants/billing'

export interface BillingAddressFormProps {
  value?: BillingDetails | null
  onChange: (billing: BillingDetails) => void
  disabled?: boolean
  showEmailField?: boolean
  className?: string
}

export const BillingAddressForm: React.FC<BillingAddressFormProps> = ({
  value,
  onChange,
  disabled = false,
  showEmailField = true,
  className,
}) => {
  const fallback = useMemo(() => value ?? defaultBillingDetails, [value])

  const [firstName, setFirstName] = useState(fallback.firstName)
  const [lastName, setLastName] = useState(fallback.lastName)
  const [address1, setAddress1] = useState(fallback.address1)
  const [city, setCity] = useState(fallback.city)
  const [stateRegion, setStateRegion] = useState(fallback.stateRegion ?? '')
  const [postalCode, setPostalCode] = useState(fallback.postalCode)
  const [country, setCountry] = useState(fallback.country)
  const [email, setEmail] = useState(fallback.email)

  useEffect(() => {
    onChange({
      firstName,
      lastName,
      address1,
      city,
      stateRegion,
      postalCode,
      country,
      email,
      provider: fallback.provider ?? 'mobius',
    })
  }, [firstName, lastName, address1, city, stateRegion, postalCode, country, email, fallback.provider, onChange])

  useEffect(() => {
    setFirstName(fallback.firstName)
    setLastName(fallback.lastName)
    setAddress1(fallback.address1)
    setCity(fallback.city)
    setStateRegion(fallback.stateRegion ?? '')
    setPostalCode(fallback.postalCode)
    setCountry(fallback.country)
    setEmail(fallback.email)
  }, [fallback])

  return (
    <div className={className}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billing-first">First name</Label>
          <Input
            id="billing-first"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing-last">Last name</Label>
          <Input
            id="billing-last"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={disabled}
            required
          />
        </div>
      </div>

      {showEmailField && (
        <div className="mt-4 space-y-2">
          <Label htmlFor="billing-email">Email</Label>
          <Input
            id="billing-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={disabled}
            required
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        <Label htmlFor="billing-address1">Address</Label>
        <Input
          id="billing-address1"
          value={address1}
          onChange={(event) => setAddress1(event.target.value)}
          disabled={disabled}
          required
        />
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billing-city">City</Label>
          <Input
            id="billing-city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing-state">State / Region</Label>
          <Input
            id="billing-state"
            value={stateRegion}
            onChange={(event) => setStateRegion(event.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billing-postal">Postal code</Label>
          <Input
            id="billing-postal"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            disabled={disabled}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={setCountry} disabled={disabled}>
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
    </div>
  )
}
