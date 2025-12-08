import { useState, useEffect, useCallback, useRef } from 'react'
import { TokenInfo } from '../types'
import { useSolanaService } from './useSolanaService'

export const useSupportedTokens = () => {
  const solanaService = useSolanaService()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<number | null>(null)

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000

  // Use refs to avoid dependency issues
  const tokensRef = useRef(tokens)
  const lastFetchedRef = useRef(lastFetched)

  // Update refs when state changes
  tokensRef.current = tokens
  lastFetchedRef.current = lastFetched

  // Fetch supported tokens from backend
  const fetchSupportedTokens = useCallback(async () => {
    // Check if we have fresh cached data
    if (
      tokensRef.current.length > 0 &&
      lastFetchedRef.current &&
      Date.now() - lastFetchedRef.current < CACHE_DURATION
    ) {
      return tokensRef.current
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('payments-ui: fetching supported Solana tokens')
      const tokens = await solanaService.fetchSupportedTokens()

      // Sort tokens by symbol for consistent ordering
      const sortedTokens = [...tokens].sort((a, b) =>
        a.symbol.localeCompare(b.symbol)
      )

      setTokens(sortedTokens)
      console.log('payments-ui: loaded supported tokens', {
        count: sortedTokens.length,
      })
      setLastFetched(Date.now())
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
  }, [solanaService])

  // Auto-fetch on mount
  useEffect(() => {
    if (tokens.length === 0) {
      fetchSupportedTokens()
    }
  }, [tokens.length, fetchSupportedTokens])

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
    setLastFetched(null) // Clear cache
    return await fetchSupportedTokens()
  }, [fetchSupportedTokens])

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
