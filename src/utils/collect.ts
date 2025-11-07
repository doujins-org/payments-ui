const SCRIPT_SRC = 'https://secure.networkmerchants.com/token/Collect.js'

export const loadCollectJs = (tokenizationKey: string): void => {
  if (typeof document === 'undefined') return
  const trimmed = tokenizationKey?.trim()
  if (!trimmed || trimmed.length < 10) {
    console.warn('payments-ui: invalid Collect.js key, skipping load')
    return
  }

  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
  if (existing) return

  const script = document.createElement('script')
  script.src = SCRIPT_SRC
  script.setAttribute('data-tokenization-key', trimmed)
  script.setAttribute('data-field-ccnumber-placeholder', '0000 0000 0000 0000')
  script.setAttribute('data-field-ccexp-placeholder', '10 / 25')
  script.setAttribute('data-field-cvv-placeholder', '123')
  script.setAttribute('data-variant', 'inline')
  script.async = true
  document.head.appendChild(script)
}
