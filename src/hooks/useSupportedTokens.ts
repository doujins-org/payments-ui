import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { TokenInfo } from '../types'
import { usePaymentContext } from '../context/PaymentContext'

export interface SolanaTokensQuery {
  checkoutSessionId?: string
  walletId?: string
  wallet?: string
  priceId?: string
}

export const useSupportedTokens = (query?: SolanaTokensQuery) => {
  const { client } = usePaymentContext()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<number | null>(null)

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000

  const cacheRef = useRef(
    new Map<string, { tokens: TokenInfo[]; fetchedAt: number }>()
  )

  const queryKey = useMemo(() => {
    const checkoutSessionId = query?.checkoutSessionId?.trim() || ''
    const walletId = query?.walletId?.trim() || ''
    const wallet = query?.wallet?.trim() || ''
    const priceId = query?.priceId?.trim() || ''
    return [checkoutSessionId, walletId, wallet, priceId].join('|')
  }, [query?.checkoutSessionId, query?.walletId, query?.wallet, query?.priceId])

  // Fetch supported tokens from backend
  const fetchSupportedTokens = useCallback(
    async (overrideQuery?: SolanaTokensQuery) => {
      const checkoutSessionId =
        overrideQuery?.checkoutSessionId ?? query?.checkoutSessionId
      const walletId = overrideQuery?.walletId ?? query?.walletId
      const wallet = overrideQuery?.wallet ?? query?.wallet
      const priceId = overrideQuery?.priceId ?? query?.priceId

      const key = [
        checkoutSessionId?.trim() || '',
        walletId?.trim() || '',
        wallet?.trim() || '',
        priceId?.trim() || '',
      ].join('|')

      const cached = cacheRef.current.get(key)
      if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
        setTokens(cached.tokens)
        setLastFetched(cached.fetchedAt)
        return cached.tokens
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log('payments-ui: fetching supported Solana tokens', {
          checkoutSessionId: checkoutSessionId || undefined,
          walletId: walletId || undefined,
          wallet: wallet || undefined,
          priceId: priceId || undefined,
        })
        const tokens = await client.getSolanaTokens({
          checkoutSessionId,
          walletId,
          wallet,
          priceId,
        })

        // Sort tokens by symbol for consistent ordering
        const sortedTokens = [...tokens].sort((a, b) =>
          a.symbol.localeCompare(b.symbol)
        )

        const fetchedAt = Date.now()
        cacheRef.current.set(key, { tokens: sortedTokens, fetchedAt })
        setTokens(sortedTokens)
        console.log('payments-ui: loaded supported tokens', {
          count: sortedTokens.length,
        })
        setLastFetched(fetchedAt)
        return sortedTokens
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch supported tokens'
        setError(errorMessage)
        console.error('Failed to fetch supported tokens:', error)

        // Return empty array on error
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [
      CACHE_DURATION,
      client,
      query?.checkoutSessionId,
      query?.priceId,
      query?.wallet,
      query?.walletId,
    ]
  )

  // Auto-fetch on mount
  useEffect(() => {
    void fetchSupportedTokens()
  }, [fetchSupportedTokens, queryKey])

  // Get token by symbol
  const getTokenBySymbol = useCallback(
    (symbol: string): TokenInfo | undefined => {
      return tokens.find((token) => token.symbol === symbol)
    },
    [tokens]
  )

  // Get token by mint address
  const getTokenByMint = useCallback(
    (mintAddress: string): TokenInfo | undefined => {
      return tokens.find((token) => token.mint === mintAddress)
    },
    [tokens]
  )

  // Check if a token is supported
  const isTokenSupported = useCallback(
    (symbol: string): boolean => {
      return tokens.some((token) => token.symbol === symbol)
    },
    [tokens]
  )

  // Get USDC token (primary stablecoin)
  const getUSDCToken = useCallback((): TokenInfo | undefined => {
    return getTokenBySymbol('USDC')
  }, [getTokenBySymbol])

  // Get PYUSD token (secondary stablecoin)
  const getPYUSDToken = useCallback((): TokenInfo | undefined => {
    return getTokenBySymbol('PYUSD')
  }, [getTokenBySymbol])

  // Get SOL token (native token)
  const getSOLToken = useCallback((): TokenInfo | undefined => {
    return getTokenBySymbol('SOL')
  }, [getTokenBySymbol])

  // Get all stablecoins
  const getStablecoins = useCallback((): TokenInfo[] => {
    return tokens.filter((token) => ['USDC', 'PYUSD'].includes(token.symbol))
  }, [tokens])

  // Refresh tokens (bypass cache)
  const refreshTokens = useCallback(async () => {
    cacheRef.current.delete(queryKey)
    setLastFetched(null)
    return await fetchSupportedTokens({ ...query })
  }, [fetchSupportedTokens, query, queryKey])

  // Check if cache is stale
  const isCacheStale = useCallback((): boolean => {
    if (!lastFetched) return true
    return Date.now() - lastFetched > CACHE_DURATION
  }, [lastFetched])

  // Get token with formatted info for display
  const getTokenDisplayInfo = useCallback((token: TokenInfo) => {
    return {
      ...token,
      displayName: `${token.name} (${token.symbol})`,
      shortAddress: `${token.mint.slice(0, 4)}...${token.mint.slice(-4)}`,
      decimalPlaces: token.decimals,
    }
  }, [])

  const getTokenPrice = useCallback(
    (symbol: string): number => {
      const token = getTokenBySymbol(symbol)
      if (!token) return 0
      const price =
        token.price ?? 0
      return typeof price === 'number' ? price : Number(price)
    },
    [getTokenBySymbol]
  )

  // Calculate token amount from USD amount
  const calculateTokenAmount = useCallback(
    (usdAmount: number, tokenSymbol: string): string => {
      const token = getTokenBySymbol(tokenSymbol)
      const price = getTokenPrice(tokenSymbol)

      if (!token || price === 0) return '0'

      const tokenAmount = usdAmount / price
      const tokenAmountInSmallestUnit =
        tokenAmount * Math.pow(10, token.decimals)

      return Math.floor(tokenAmountInSmallestUnit).toString()
    },
    [getTokenBySymbol, getTokenPrice]
  )

  // Format token amount for display
  const formatTokenAmount = useCallback(
    (amount: string, tokenSymbol: string): string => {
      const token = getTokenBySymbol(tokenSymbol)
      if (!token) return '0'

      const numericAmount = parseFloat(amount)
      const displayAmount = numericAmount / Math.pow(10, token.decimals)

      return displayAmount.toFixed(token.decimals <= 6 ? token.decimals : 6)
    },
    [getTokenBySymbol]
  )

  return {
    tokens,
    isLoading,
    error,
    lastFetched,
    fetchSupportedTokens,
    refreshTokens,
    getTokenBySymbol,
    getTokenByMint,
    isTokenSupported,
    getUSDCToken,
    getPYUSDToken,
    getSOLToken,
    getStablecoins,
    getTokenDisplayInfo,
    getTokenPrice,
    calculateTokenAmount,
    formatTokenAmount,
    isCacheStale,
    hasTokens: tokens.length > 0,
    tokenCount: tokens.length,
  }
}
