import type { CollectJS } from '../types/collect'

const SCRIPT_SRC = 'https://secure.networkmerchants.com/token/Collect.js'
const baseFieldReset = {
  border: 'none',
  'border-bottom': '0',
  'border-top': '0',
  'border-left': '0',
  'border-right': '0',
  'border-width': '0',
  'border-color': 'transparent',
  'border-style': 'none',
  outline: 'none',
  'box-shadow': 'none',
  'background-clip': 'padding-box',
  'text-decoration': 'none',
}

const customCss = {
  ...baseFieldReset,
  background: '#0d1325',
  'background-color': '#0d1325',
  color: '#e2e8f0',
  padding: '0',
  margin: '0',
  width: '100%',
  height: '100%',
  'font-size': '15px',
  'letter-spacing': '0.05em',
  'line-height': '1.5',
}
const focusCss = {
  ...baseFieldReset,
  color: '#f8fafc',
  'box-shadow': '0 0 0 1px rgba(94,234,212,0.3)',
}
const invalidCss = {
  ...baseFieldReset,
  color: '#fecaca',
  'box-shadow': '0 0 0 1px rgba(248,113,113,0.5)',
}
const placeholderCss = {
  color: 'rgba(226,232,240,0.45)',
  'font-size': '14px',
  'letter-spacing': '0.03em',
}

const baseCssString = JSON.stringify(customCss)
const focusCssString = JSON.stringify(focusCss)
const invalidCssString = JSON.stringify(invalidCss)
const placeholderCssString = JSON.stringify(placeholderCss)

export const collectCssConfig = {
  customCss,
  focusCss,
  invalidCss,
  placeholderCss,
}

declare global {
  interface Window {
    CollectJS?: CollectJS
    __doujinsCollectPromise?: Promise<void>
  }
}

let loadPromise: Promise<void> | null = null

export const loadCollectJs = (tokenizationKey: string): Promise<void> | void => {
  if (typeof document === 'undefined') return
  if (typeof window !== 'undefined' && window.CollectJS) {
    return Promise.resolve()
  }

  const trimmed = tokenizationKey?.trim()
  if (!trimmed || trimmed.length < 10) {
    console.warn('payments-ui: invalid Collect.js key, skipping load')
    return
  }

  if (loadPromise) {
    return loadPromise
  }

  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
  if (existing) {
    loadPromise = new Promise((resolve) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => resolve(), { once: true })
    })
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.setAttribute('data-tokenization-key', trimmed)
    script.setAttribute('data-field-ccnumber-placeholder', '0000 0000 0000 0000')
    script.setAttribute('data-field-ccexp-placeholder', '10 / 25')
    script.setAttribute('data-field-cvv-placeholder', '123')
    script.setAttribute('data-variant', 'inline')
    script.setAttribute('data-style-sniffer', 'false')
    script.setAttribute('data-custom-css', baseCssString)
    script.setAttribute('data-placeholder-css', placeholderCssString)
    script.setAttribute('data-focus-css', focusCssString)
    script.setAttribute('data-invalid-css', invalidCssString)
    script.async = true
    script.addEventListener('load', () => {
      console.log('payments-ui: Collect.js loaded')
      resolve()
    })
    script.addEventListener('error', (event) => {
      console.error('payments-ui: failed to load Collect.js', event)
      reject(event)
    })
    document.head.appendChild(script)
  })

  window.__doujinsCollectPromise = loadPromise
  return loadPromise
}

export const waitForCollectJs = async (): Promise<CollectJS | null> => {
  if (typeof window === 'undefined') return null
  if (window.CollectJS) return window.CollectJS

  const promise = loadPromise ?? window.__doujinsCollectPromise
  if (!promise) return null

  try {
    await promise
    return window.CollectJS ?? null
  } catch (error) {
    console.error('payments-ui: Collect.js failed to initialise', error)
    return null
  }
}
