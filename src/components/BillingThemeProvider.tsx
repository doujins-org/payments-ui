import React from 'react'
import { cn } from '../lib/utils'

export interface BillingThemeProviderProps {
  children: React.ReactNode
  className?: string
  /**
   * When true, applies the dark theme variant
   * @default false
   */
  dark?: boolean
}

/**
 * Scopes the Payments UI theme variables so host app styles are left intact.
 * Use this to wrap any Payments UI components to ensure styles don't conflict
 * with the consuming application.
 * 
 * @example
 * ```tsx
 * <BillingThemeProvider>
 *   <SubscriptionCheckoutModal ... />
 * </BillingThemeProvider>
 * ```
 */
export const BillingThemeProvider: React.FC<BillingThemeProviderProps> = ({
  children,
  className,
  dark = false,
}) => {
  return (
    <div
      className={cn(
        'payments-ui-root',
        dark && 'dark',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
prevent conflicts with client app styles
 */
export const BillingThemePortal: React.FC<BillingThemeProviderProps> = ({
  children,
  className,
  dark = false,
}) => {
  return (
    <div
      className={cn(
        'payments-ui-portal',
        dark && 'dark',
        className
      )}
    >
      {children}
    </div>
  )
}


