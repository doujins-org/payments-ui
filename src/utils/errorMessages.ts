import { ClientApiError } from '../lib/client'

/**
 * Resolve an error message using a code-to-message translation map.
 * Translation is applied only when the error exposes a `code` value.
 */
export const resolveErrorMessageByCode = (
  error: unknown,
  translationErrors?: Record<string, string>,
  fallbackMessage?: string
): string => {
  const errors = translationErrors ?? {}
  const defaultMessage =
    fallbackMessage ??
    (error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'An unexpected error occurred')
  
  if (error instanceof ClientApiError) {
    const payload = error.body as { code?: string; error?: { code?: string; message?: string } }
    const code = payload?.code ?? payload?.error?.code
    if (code && errors[code]) return errors[code]
    if (typeof payload?.error?.message === 'string') return payload.error.message
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && errors[code]) return errors[code]
  }

  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return defaultMessage
}
