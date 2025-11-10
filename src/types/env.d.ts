interface ImportMetaEnv {
  VITE_SOLANA_RPC_URL?: string
  VITE_PUBLIC_MERCHANT_WALLET?: string
  [key: string]: string | undefined
}

interface ImportMeta {
  env: ImportMetaEnv
}
