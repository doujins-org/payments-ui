// Use country-list package for standard country data
import countryList from 'country-list'

// Define our interfaces for TypeScript support
export interface Country {
  code: string
  name: string
}

// Some countries that need customization or that might be missing from the base package
const customCountries: Country[] = [
  { code: 'TW', name: 'Taiwan, Province of China' },
  { code: 'KR', name: 'Korea' },
  { code: 'KP', name: 'North Korea' },
  { code: 'PS', name: 'Palestine, State of' },
  { code: 'VA', name: 'Holy See (Vatican City State)' },
  { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba' },
  { code: 'SX', name: 'Sint Maarten (Dutch part)' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'FM', name: 'Micronesia, Federated States Of' },
  { code: 'TR', name: 'Türkiye' },
]

// Apply customizations to the country list
countryList.overwrite(customCountries)

// Get the countries from the package and sort them alphabetically by name
export const countries: Country[] = countryList
  .getData()
  .sort((a, b) => a.name.localeCompare(b.name))
