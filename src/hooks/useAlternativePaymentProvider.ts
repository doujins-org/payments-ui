import { useState, useCallback } from 'react'
import { useSubscriptionActions } from './useSubscriptionActions'
import type { FlexFormResponse } from '../types/subscription'

interface FlexFormPayload {
  priceId: string
  firstName: string
  lastName: string
  address1: string
  city: string
  state: string
  zipCode: string
  country: string
}

export const useAlternativePaymentProvider = () => {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [flexForm, setFlexForm] = useState<FlexFormResponse | null>(null)
	const { generateFlexFormUrl } = useSubscriptionActions()

	const openFlexForm = useCallback(
		async (payload: FlexFormPayload) => {
			setIsLoading(true)
			setError(null)
			try {
				const response = await generateFlexFormUrl(payload)
				if (response?.iframe_url) {
					setFlexForm(response)
				} else {
					throw new Error('Unable to launch payment provider.')
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to open payment provider.'
				setError(message)
				console.error('[payments-ui] failed to open alternative payment provider', err)
			} finally {
				setIsLoading(false)
			}
		},
		[generateFlexFormUrl]
	)

	const closeFlexForm = useCallback(() => {
		setFlexForm(null)
	}, [])

	return { openFlexForm, isLoading, error, flexForm, closeFlexForm }
}
