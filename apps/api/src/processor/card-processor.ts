import type { CardStatus } from '@prisma/client'

/**
 * The card processor's view of the person holding the cards.
 */
export interface ProcessorCardholder {
  stripeId: string
  name: string
  /**
   * Stripe permits a cardholder with no email, so this is nullable here even
   * though our own column is not. Ingestion has to decide on a substitute.
   */
  email: string | null
}

export interface ProcessorCard {
  stripeId: string
  cardholderStripeId: string
  last4: string
  brand: string
  status: CardStatus
  currency: string
}

/** One page of a processor list, in our shape rather than the vendor's. */
export interface ProcessorPage<T> {
  items: T[]
  hasMore: boolean
  /** Feed back as `startingAfter` to fetch the next page. Absent on the last one. */
  nextCursor: string | undefined
}

export interface ListCardsParams {
  cardholderStripeId?: string
  limit?: number
  startingAfter?: string
}

/**
 * The boundary between our ingestion code and the card processor.
 *
 * It exists for two reasons. Webhooks are the only ingestion path, so a card or
 * cardholder that we never received an event for is simply missing, and since
 * `card_id` is a real foreign key an authorization for an unknown card cannot be
 * written at all. This port is how ingestion backfills that gap on demand.
 * Second, it lets the test suite substitute a fake and drop the network.
 *
 * Reads return null for "the processor does not have this", and throw only when
 * the call itself failed. Callers need to tell those apart: the first is a fact,
 * the second is worth retrying.
 */
export interface CardProcessor {
  getCardholder(stripeId: string): Promise<ProcessorCardholder | null>
  getCard(stripeId: string): Promise<ProcessorCard | null>
  listCards(params?: ListCardsParams): Promise<ProcessorPage<ProcessorCard>>
}

/** An interface has no runtime identity, so injection needs an explicit token. */
export const CARD_PROCESSOR = Symbol('CARD_PROCESSOR')
