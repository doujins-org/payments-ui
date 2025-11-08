export interface WalletAccount {
  publicKey: string
}

export interface WalletAdapterLike {
  publicKey?: { toBase58(): string }
  signTransaction?: (tx: unknown) => Promise<unknown>
  signVersionedTransaction?: (tx: unknown) => Promise<unknown>
}

export class WalletGateway {
  private adapter: WalletAdapterLike | null = null

  setAdapter(adapter: WalletAdapterLike | null): void {
    this.adapter = adapter
  }

  getPublicKey(): string | null {
    if (!this.adapter?.publicKey) return null
    try {
      return this.adapter.publicKey.toBase58()
    } catch {
      return null
    }
  }

  async sign(transaction: unknown): Promise<unknown> {
    if (!this.adapter) {
      throw new Error('payments-ui: wallet adapter not set')
    }

    if (typeof this.adapter.signVersionedTransaction === 'function') {
      return this.adapter.signVersionedTransaction(transaction)
    }

    if (typeof this.adapter.signTransaction === 'function') {
      return this.adapter.signTransaction(transaction)
    }

    throw new Error('payments-ui: wallet adapter cannot sign transactions')
  }
}
