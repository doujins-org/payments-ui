import React from 'react'
import { cn } from '../lib/utils'

export interface PaymentsUIRootProps {
  children: React.ReactNode
  className?: string
  /**
   * When true, applies the dark theme variant
   * @default false
   */
  dark?: boolean
}

/**
 * Root wrapper component that provides scoped CSS variables for payments-ui.
 * Use this to wrap any payments-ui components to ensure styles don't conflict
 * with the consuming application.
 * 
 * @example
 * ```tsx
 * <PaymentsUIRoot>
 *   <SubscriptionCheckoutModal ... />
 * </PaymentsUIRoot>
 * ```
 */
export const PaymentsUIRoot: React.FC<PaymentsUIRootProps> = ({
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
export const PaymentsUIPortalRoot: React.FC<PaymentsUIRootProps> = ({
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

