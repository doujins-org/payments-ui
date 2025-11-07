import { useEffect, useRef, useState } from 'react'
import { countries } from '../data/countries'

export function useCountryDropdown() {
  const [country, setCountry] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const countryDropdownRef = useRef<HTMLDivElement | null>(null)

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setCountryOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return {
    country,
    setCountry,
    countryOpen,
    setCountryOpen,
    countrySearch,
    setCountrySearch,
    countryDropdownRef,
    filteredCountries,
  }
}
