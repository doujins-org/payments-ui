export interface TokenMetadata {
  symbol: string
  name: string
  mint: string
  decimals: number
  isNative?: boolean
}

export interface NetworkConfig {
  name: string
  rpcEndpoint: string
  explorerUrl: string
  tokens: Record<string, TokenMetadata>
  programs: {
    tokenProgram: string
    token2022Program: string
    associatedTokenProgram: string
    systemProgram: string
  }
}

export const NETWORK_CONFIG: Record<'mainnet' | 'devnet', NetworkConfig> = {
  mainnet: {
    name: 'mainnet-beta',
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    tokens: {
      SOL: {
        symbol: 'SOL',
        name: 'Solana',
        mint: 'native',
        decimals: 9,
        isNative: true,
      },
      USDC: {
        symbol: 'USDC',
        name: 'USD Coin',
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
      USDT: {
        symbol: 'USDT',
        name: 'Tether',
        mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        decimals: 6,
      },
      PYUSD: {
        symbol: 'PYUSD',
        name: 'PayPal USD',
        mint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
        decimals: 6,
      },
    },
    programs: {
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      token2022Program: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
      associatedTokenProgram: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      systemProgram: '11111111111111111111111111111111',
    },
  },
  devnet: {
    name: 'devnet',
    rpcEndpoint: 'https://api.devnet.solana.com',
    explorerUrl: 'https://solscan.io?cluster=devnet',
    tokens: {
      SOL: {
        symbol: 'SOL',
        name: 'Solana',
        mint: 'native',
        decimals: 9,
        isNative: true,
      },
      USDC: {
        symbol: 'USDC',
        name: 'USD Coin (Devnet)',
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
        decimals: 6,
      },
    },
    programs: {
      tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      token2022Program: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
      associatedTokenProgram: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      systemProgram: '11111111111111111111111111111111',
    },
  },
}

export const NETWORK_TOKENS = {
  mainnet: NETWORK_CONFIG.mainnet.tokens,
  devnet: NETWORK_CONFIG.devnet.tokens,
} as const

export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'

// Stablecoin symbols for easier checking
export const STABLECOIN_SYMBOLS = ['USDC', 'USDT', 'PYUSD'] as const

export type StablecoinSymbol = (typeof STABLECOIN_SYMBOLS)[number]

// Helper function to check if a token is a stablecoin
export const isStablecoin = (symbol: string): symbol is StablecoinSymbol => {
  return STABLECOIN_SYMBOLS.includes(symbol as StablecoinSymbol)
}

// Helper functions for network-specific tokens
export type SolanaNetwork = 'mainnet' | 'devnet'

/**
 * Get network configuration
 * @param network - The Solana network ('mainnet' or 'devnet')
 * @returns Network configuration
 */
export const getNetworkConfig = (network: SolanaNetwork): NetworkConfig => {
  return NETWORK_CONFIG[network]
}

/**
 * Get supported tokens for a specific network
 * @param network - The Solana network ('mainnet' or 'devnet')
 * @returns Array of supported token metadata
 */
export const getSupportedTokensByNetwork = (
  network: SolanaNetwork
): TokenMetadata[] => {
  return Object.values(NETWORK_CONFIG[network].tokens)
}

/**
 * Get network-specific program ID
 * @param network - The Solana network
 * @param program - Program type
 * @returns Program ID address
 */
export const getProgramId = (
  network: SolanaNetwork,
  program: keyof NetworkConfig['programs']
): string => {
  return NETWORK_CONFIG[network].programs[program]
}

/**
 * Detect network from RPC URL
 * @param rpcUrl - Solana RPC endpoint URL
 * @returns Detected network type
 */
export const detectNetworkFromRpcUrl = (rpcUrl: string): SolanaNetwork => {
  if (rpcUrl.includes('devnet')) return 'devnet'
  if (rpcUrl.includes('testnet')) return 'devnet' // Treat testnet as devnet for tokens
  return 'mainnet' // Default to mainnet
}

/**
 * Get current network from environment
 * @returns Current network based on environment
 */
export const getCurrentNetwork = (): SolanaNetwork => {
  const rpcUrl =
    import.meta?.env?.VITE_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com'
  return detectNetworkFromRpcUrl(rpcUrl)
}


export const getMerchantWallet = (): string => {
  const merchantWallet = import.meta.env.VITE_PUBLIC_MERCHANT_WALLET

  if (merchantWallet) {
    return merchantWallet
  }

  return '11111111111111111111111111111112'
}
