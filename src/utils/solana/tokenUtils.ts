import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedAccountData,
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { TokenInfo } from '../../types'

export interface TokenBalance {
  mint: string
  symbol: string
  name: string
  balance: number
  uiBalance: string
  decimals: number
  isNative: boolean
}

export interface ParsedTokenAccount {
  mint: string
  owner: string
  amount: string
  uiAmount: number
  decimals: number
}

export const getSolBalance = async (
  connection: Connection,
  publicKey: PublicKey
): Promise<number> => {
  try {
    const lamports = await connection.getBalance(publicKey)
    return lamports / LAMPORTS_PER_SOL
  } catch (error) {
    console.error('Failed to fetch SOL balance:', error)
    return 0
  }
}

export const fetchAllTokenBalances = async (
  connection: Connection,
  publicKey: PublicKey
): Promise<Map<string, number>> => {
  const balances = new Map<string, number>()

  try {
    const tokenAccounts = await connection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID,
      {
        filters: [
          {
            dataSize: 165, // Size of token account
          },
          {
            memcmp: {
              offset: 32, // Owner field offset
              bytes: publicKey.toString(),
            },
          },
        ],
      }
    )

    for (const account of tokenAccounts) {
      const data = account.account.data as ParsedAccountData
      interface TokenParsed { info?: { mint: string; tokenAmount?: { uiAmount?: number } } }
      const parsed = data.parsed as TokenParsed
      const info = parsed?.info
      if (info && info.tokenAmount) {
        const mintAddress = info.mint
        const uiAmount = info.tokenAmount.uiAmount || 0

        if (uiAmount > 0) {
          balances.set(mintAddress, uiAmount)
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch token balances:', error)
  }

  return balances
}

export const getTokenBalance = async (
  connection: Connection,
  publicKey: PublicKey,
  mintAddress: string
): Promise<number> => {
  try {
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: new PublicKey(mintAddress),
    })

    if (tokenAccounts.value.length === 0) {
      return 0
    }

    const tokenAccount = tokenAccounts.value[0]
    const accountInfo = await connection.getParsedAccountInfo(
      tokenAccount.pubkey
    )

    const valueData = accountInfo.value?.data as ParsedAccountData | null | undefined
    if (valueData && valueData.parsed) {
      interface TokenParsed { info?: { tokenAmount?: { uiAmount?: number } } }
      const parsed = valueData.parsed as TokenParsed
      if (parsed.info?.tokenAmount) {
        return parsed.info.tokenAmount.uiAmount || 0
      }
    }

    return 0
  } catch (error) {
    console.error(`Failed to fetch balance for token ${mintAddress}:`, error)
    return 0
  }
}

export const fetchSupportedTokenBalances = async (
  connection: Connection,
  publicKey: PublicKey,
  supportedTokens: TokenInfo[]
): Promise<TokenBalance[]> => {
  const results: TokenBalance[] = []

  const solBalance = await getSolBalance(connection, publicKey)
  const solTokenMeta =
    supportedTokens.find((token) => token.is_native || token.symbol === 'SOL') ||
    {
      symbol: 'SOL',
      name: 'Solana',
      mint: 'So11111111111111111111111111111111111111112',
      decimals: 9,
      price: 0,
      is_native: true,
    }

  results.push({
    mint: solTokenMeta.mint,
    symbol: solTokenMeta.symbol,
    name: solTokenMeta.name,
    balance: solBalance,
    uiBalance: solBalance.toFixed(solTokenMeta.decimals <= 4 ? solTokenMeta.decimals : 4),
    decimals: solTokenMeta.decimals,
    isNative: true,
  })

  const tokenBalances = await fetchAllTokenBalances(connection, publicKey)

  const tokenMetaByMint = new Map(
    supportedTokens
      .filter((token) => !(token.is_native || token.symbol === 'SOL')).map((token) => [token.mint, token])
  )

  for (const [mint, tokenMeta] of tokenMetaByMint.entries()) {
    const balance = tokenBalances.get(mint) || 0

    results.push({
      mint,
      symbol: tokenMeta.symbol,
      name: tokenMeta.name,
      balance,
      uiBalance: balance.toFixed(tokenMeta.decimals <= 6 ? tokenMeta.decimals : 6),
      decimals: tokenMeta.decimals,
      isNative: false,
    })
  }

  return results
}

/**
 * Parse token account data from RPC response
 * @param accountData - Raw account data from RPC
 * @returns Parsed token account info
 */
export const parseTokenAccountData = (
  accountData: any
): ParsedTokenAccount | null => {
  try {
    const parsedInfo = accountData.parsed?.info
    if (!parsedInfo) return null

    return {
      mint: parsedInfo.mint,
      owner: parsedInfo.owner,
      amount: parsedInfo.tokenAmount.amount,
      uiAmount: parsedInfo.tokenAmount.uiAmount || 0,
      decimals: parsedInfo.tokenAmount.decimals,
    }
  } catch (error) {
    console.error('Failed to parse token account data:', error)
    return null
  }
}

export const convertToUIAmount = (
  rawAmount: string,
  decimals: number
): number => {
  try {
    const amount = parseInt(rawAmount, 10)
    return amount / Math.pow(10, decimals)
  } catch (error) {
    console.error('Failed to convert to UI amount:', error)
    return 0
  }
}

export const convertToRawAmount = (
  uiAmount: number,
  decimals: number
): string => {
  try {
    const rawAmount = Math.floor(uiAmount * Math.pow(10, decimals))
    return rawAmount.toString()
  } catch (error) {
    console.error('Failed to convert to raw amount:', error)
    return '0'
  }
}

export const hasSufficientBalance = (
  balance: number,
  requiredAmount: number,
  buffer: number = 0.05
): boolean => {
  const requiredWithBuffer = requiredAmount * (1 + buffer)
  return balance >= requiredWithBuffer
}
