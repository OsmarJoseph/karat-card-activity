import type { Prisma } from '@prisma/client'
import { TransactionType } from '@prisma/client'
import type Stripe from 'stripe'
import {
  fromUnixSeconds,
  mapMerchant,
  type NormalizedEvent,
  type NormalizedTransaction,
} from '@/ingestion/normalized'
import { toProcessorCard, toProcessorCardholder } from '@/processor/stripe-card-processor'

/**
 * Stripe may send a nested object or just its id, depending on the event.
 */
function idOf<T extends { id: string }>(value: string | T | null): string | null {
  if (value === null) {
    return null
  }
  return typeof value === 'string' ? value : value.id
}

function expanded<T extends { id: string }>(value: string | T | null): T | null {
  return value === null || typeof value === 'string' ? null : value
}

/**
 * Refuses an unrecognised type instead of guessing. Type decides the sign of the
 * amount, and a wrongly signed row would corrupt every aggregate silently, so the
 * event is recorded with its reason rather than written wrong.
 */
function mapType(type: Stripe.Issuing.Transaction.Type, id: string): TransactionType {
  switch (type) {
    case 'capture':
      return TransactionType.capture
    case 'refund':
      return TransactionType.refund
    default:
      throw new Error(`Unsupported Stripe transaction type "${type}" on ${id}`)
  }
}

export function normalizeTransaction(
  event: Stripe.Event,
  transaction: Stripe.Issuing.Transaction,
): NormalizedEvent<NormalizedTransaction> {
  const cardStripeId = idOf(transaction.card)
  if (!cardStripeId) {
    throw new Error(`Transaction ${transaction.id} has no card`)
  }

  const card = expanded(transaction.card)
  const type = mapType(transaction.type, transaction.id)

  // Stripe signs this by balance impact, so a capture arrives negative. Our model
  // is the other way round, and rather than invert Stripe's sign we take the
  // magnitude and let the explicit type decide, which cannot silently break if
  // Stripe's convention ever changes.
  const magnitude = Math.abs(transaction.amount)

  return {
    cardStripeId,
    card: card ? toProcessorCard(card) : null,
    cardholder: card ? toProcessorCardholder(card.cardholder) : null,
    activity: {
      stripeId: transaction.id,
      amount: type === TransactionType.refund ? -magnitude : magnitude,
      currency: transaction.currency,
      type,
      authorizationStripeId: idOf(transaction.authorization),
      ...mapMerchant(transaction.merchant_data),
      occurredAt: fromUnixSeconds(transaction.created),
      lastEventAt: fromUnixSeconds(event.created),
      raw: transaction as unknown as Prisma.InputJsonValue,
    },
  }
}
