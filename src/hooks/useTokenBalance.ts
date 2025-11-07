import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { TokenBalance, TokenInfo } from '../types'

export const useTokenBalance = (tokens: TokenInfo[]) => {
  const { publicKey } = useWallet()
  const { connection } = useConnection()

  const [balances, setBalances] = useState<TokenBalance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch balance for a specific token
  const fetchTokenBalance = useCallback(
    async (
      token: TokenInfo,
      walletAddress: PublicKey
    ): Promise<TokenBalance> => {
      try {
        const mintPublicKey = new PublicKey(token.mint)

        // Get the associated token account address
        const associatedTokenAddress = await getAssociatedTokenAddress(
          mintPublicKey,
          walletAddress
        )

        try {
          // Get the token account info
          const tokenAccount = await getAccount(
            connection,
            associatedTokenAddress
          )

          const balance = Number(tokenAccount.amount)
          const uiAmount = balance / Math.pow(10, token.decimals)

          return {
            token,
            balance,
            uiAmount,
            hasBalance: balance > 0,
          }
        } catch (accountError) {
          // Account doesn't exist, balance is 0
          return {
            token,
            balance: 0,
            uiAmount: 0,
            hasBalance: false,
          }
        }
      } catch (error) {
        console.error(`Failed to fetch balance for ${token.symbol}:`, error)
        return {
          token,
          balance: 0,
          uiAmount: 0,
          hasBalance: false,
        }
      }
    },
    [connection]
  )

  // Memoize token serialization to prevent unnecessary refetches
  const tokensKey = useMemo(() => tokens.map((t) => t.mint).join(','), [tokens])

  // Auto-fetch balances when wallet or tokens change
  useEffect(() => {
    if (!publicKey || tokens.length === 0) {
      setBalances([])
      return
    }

    setIsLoading(true)
    setError(null)

    const fetchAllBalances = async () => {
      try {
        const balancePromises = tokens.map((token) =>
          fetchTokenBalance(token, publicKey)
        )
        const tokenBalances = await Promise.all(balancePromises)

        setBalances(tokenBalances)
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch token balances'
        setError(errorMessage)
        console.error('Failed to fetch token balances:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllBalances()
  }, [publicKey, tokensKey, fetchTokenBalance]) // Use stable dependencies

  // Get balance for a specific token
  const getTokenBalance = useCallback(
    (tokenSymbol: string): TokenBalance | undefined => {
      return balances.find((balance) => balance.token.symbol === tokenSymbol)
    },
    [balances]
  )

  // Check if user has sufficient balance for a payment
  const hasSufficientBalance = useCallback(
    (tokenSymbol: string, requiredAmount: number): boolean => {
      const balance = getTokenBalance(tokenSymbol)
      return balance ? balance.uiAmount >= requiredAmount : false
    },
    [getTokenBalance]
  )

  // Get formatted balance string
  const getFormattedBalance = useCallback(
    (tokenSymbol: string): string => {
      const balance = getTokenBalance(tokenSymbol)
      if (!balance) return '0.00'

      // Format with appropriate decimal places
      if (balance.uiAmount < 0.01) {
        return balance.uiAmount.toFixed(6)
      } else if (balance.uiAmount < 1) {
        return balance.uiAmount.toFixed(4)
      } else {
        return balance.uiAmount.toFixed(2)
      }
    },
    [getTokenBalance]
  )

  // Refresh balances manually
  const refreshBalances = useCallback(async () => {
    if (!publicKey || tokens.length === 0) {
      setBalances([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const balancePromises = tokens.map((token) =>
        fetchTokenBalance(token, publicKey)
      )
      const tokenBalances = await Promise.all(balancePromises)

      setBalances(tokenBalances)
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch token balances'
      setError(errorMessage)
      console.error('Failed to fetch token balances:', error)
    } finally {
      setIsLoading(false)
    }
  }, [publicKey, tokens, fetchTokenBalance])

  // Get total USD value of balances (would need price data)
  const getTotalValue = useCallback(
    (priceData?: Record<string, number>): number => {
      if (!priceData) return 0

      return balances.reduce((total, balance) => {
        const price = priceData[balance.token.symbol] || 0
        return total + balance.uiAmount * price
      }, 0)
    },
    [balances]
  )

  // Sort balances by amount (highest first)
  const sortedBalances = [...balances].sort((a, b) => b.uiAmount - a.uiAmount)

  // Get balances with positive amounts only
  const positiveBalances = balances.filter((balance) => balance.hasBalance)

  return {
    balances: sortedBalances,
    positiveBalances,
    isLoading,
    error,
    refreshBalances,
    getTokenBalance,
    hasSufficientBalance,
    getFormattedBalance,
    getTotalValue,
    hasAnyBalance: positiveBalances.length > 0,
    isConnected: !!publicKey,
  }
}
