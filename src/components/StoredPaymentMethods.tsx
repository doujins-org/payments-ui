import React, { useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { CreditCard, Loader2, Trash2, WalletCards, X } from 'lucide-react'
import clsx from 'clsx'
import { CardDetailsForm } from './CardDetailsForm'
import { usePaymentMethods } from '../hooks/usePaymentMethods'
import type { BillingDetails, PaymentMethod } from '../types'

const formatCardLabel = (method: PaymentMethod): string => {
  const brand = method.card_type ? method.card_type.toUpperCase() : 'CARD'
  const lastFour = method.last_four ? `•••• ${method.last_four}` : ''
  return `${brand} ${lastFour}`.trim()
}

export interface StoredPaymentMethodsProps {
  selectedMethodId?: string | null
  onMethodSelect?: (method: PaymentMethod) => void
  showAddButton?: boolean
  heading?: string
  description?: string
}

export const StoredPaymentMethods: React.FC<StoredPaymentMethodsProps> = ({
  selectedMethodId,
  onMethodSelect,
  showAddButton = true,
  heading = 'Payment Methods',
  description = 'Manage your saved cards',
}) => {
  const { listQuery, createMutation, deleteMutation } = usePaymentMethods()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const payments = useMemo(() => listQuery.data?.data ?? [], [listQuery.data])

  const handleCardTokenize = (token: string, billing: BillingDetails) => {
    createMutation.mutate({ token, billing })
  }

  const handleDelete = (method: PaymentMethod) => {
    setDeletingId(method.id)
    deleteMutation.mutate(
      { id: method.id },
      {
        onSettled: () => setDeletingId(null),
      }
    )
  }

  return (
    <div className="payments-ui-panel">
      <div className="payments-ui-panel-header">
        <div>
          <p className="payments-ui-panel-title">
            <WalletCards className="payments-ui-icon" /> {heading}
          </p>
          <p className="payments-ui-panel-description">{description}</p>
        </div>
        {showAddButton && (
          <button
            className="payments-ui-button"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            <CreditCard className="payments-ui-icon" /> Add card
          </button>
        )}
      </div>

      <div className="payments-ui-panel-body">
        {listQuery.isLoading ? (
          <div className="payments-ui-empty">
            <Loader2 className="payments-ui-spinner" /> Loading cards...
          </div>
        ) : payments.length === 0 ? (
          <div className="payments-ui-empty">No saved payment methods yet.</div>
        ) : (
          <div className="payments-ui-method-list">
            {payments.map((method) => {
              const isSelected = selectedMethodId === method.id
              return (
                <div
                  key={method.id}
                  className={clsx('payments-ui-method-item', {
                    'is-selected': isSelected,
                  })}
                >
                  <div>
                    <p className="payments-ui-method-label">
                      {formatCardLabel(method)}
                    </p>
                    <p className="payments-ui-method-meta">
                      Added on{' '}
                      {method.created_at
                        ? new Date(method.created_at).toLocaleDateString()
                        : 'unknown'}
                    </p>
                  </div>
                  <div className="payments-ui-method-actions">
                    {onMethodSelect && (
                      <button
                        type="button"
                        className="payments-ui-text-button"
                        onClick={() => onMethodSelect(method)}
                      >
                        {isSelected ? 'Selected' : 'Use card'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="payments-ui-icon-button payments-ui-danger"
                      onClick={() => handleDelete(method)}
                      disabled={deletingId === method.id && deleteMutation.isPending}
                    >
                      {deletingId === method.id && deleteMutation.isPending ? (
                        <Loader2 className="payments-ui-spinner" />
                      ) : (
                        <Trash2 className="payments-ui-icon" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="payments-ui-modal-overlay" />
          <Dialog.Content className="payments-ui-modal">
            <div className="payments-ui-modal-header">
              <div>
                <h3>Add a new card</h3>
                <p>Your card details are tokenized securely via our payment provider.</p>
              </div>
              <Dialog.Close className="payments-ui-icon-button">
                <X className="payments-ui-icon" />
              </Dialog.Close>
            </div>
            <CardDetailsForm
              visible={isModalOpen}
              collectPrefix="payments-ui-card"
              submitting={createMutation.isPending}
              submitLabel="Save card"
              externalError={createMutation.error?.message ?? null}
              onTokenize={handleCardTokenize}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
