export type PaymentEvent = {
  type: string
  payload?: unknown
  timestamp: number
}

export type EventListener = (event: PaymentEvent) => void

export class EventEmitter {
  private listeners = new Map<string, Set<EventListener>>()

  emit(type: string, payload?: unknown): void {
    const event: PaymentEvent = {
      type,
      payload,
      timestamp: Date.now(),
    }

    const listeners = this.listeners.get(type)
    if (!listeners || listeners.size === 0) {
      return
    }

    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('payments-ui:event-bus listener error', error)
      }
    }
  }

  subscribe(type: string, listener: EventListener): () => void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.listeners.delete(type)
      }
    }
  }

  clearAll(): void {
    this.listeners.clear()
  }
}
