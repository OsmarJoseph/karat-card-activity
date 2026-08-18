import { Injectable, Logger } from '@nestjs/common'
import { CardStatus } from '@prisma/client'
import Stripe from 'stripe'
import { AppConfigService } from '@/config/app-config.service'
import type {
  CardProcessor,
  ListCardsParams,
  ProcessorCard,
  ProcessorCardholder,
  ProcessorPage,
} from '@/processor/card-processor'

/**
 * Pinned rather than left to the SDK default, so upgrading the library cannot
 * silently change the API contract underneath us.
 */
const STRIPE_API_VERSION = '2026-07-29.dahlia'

/** Stripe's maximum page size. Fewer round trips during a backfill. */
const MAX_PAGE_SIZE = 100

@Injectable()
export class StripeCardProcessor implements CardProcessor {
  private readonly stripe: Stripe

  constructor(config: AppConfigService) {
    this.stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
      // Stripe's own guidance for transient failures. Reads are idempotent.
      maxNetworkRetries: 2,
    })
  }

  async getCardholder(stripeId: string): Promise<ProcessorCardholder | null> {
    try {
      return toProcessorCardholder(await this.stripe.issuing.cardholders.retrieve(stripeId))
    } catch (error: unknown) {
      if (isResourceMissing(error)) {
        return null
      }
      throw error
    }
  }

  async getCard(stripeId: string): Promise<ProcessorCard | null> {
    try {
      return toProcessorCard(await this.stripe.issuing.cards.retrieve(stripeId))
    } catch (error: unknown) {
      if (isResourceMissing(error)) {
        return null
      }
      throw error
    }
  }

  async listCards(params: ListCardsParams = {}): Promise<ProcessorPage<ProcessorCard>> {
    const query: Stripe.Issuing.CardListParams = {
      limit: Math.min(params.limit ?? MAX_PAGE_SIZE, MAX_PAGE_SIZE),
    }
    if (params.cardholderStripeId) {
      query.cardholder = params.cardholderStripeId
    }
    if (params.startingAfter) {
      query.starting_after = params.startingAfter
    }

    const page = await this.stripe.issuing.cards.list(query)

    return {
      items: page.data.map(toProcessorCard),
      hasMore: page.has_more,
      // Stripe's cursor is the last id of the page, and only matters if more follow.
      nextCursor: page.has_more ? page.data.at(-1)?.id : undefined,
    }
  }
}

/**
 * Stripe types card status as its three known values plus an open string, so it
 * reserves the right to add more. An unknown status is stored as unusable rather
 * than assumed active, because a card silently misfiled as spendable is worse than
 * a noisy log line.
 */
export function mapStripeCardStatus(
  status: Stripe.Issuing.Card.Status,
  cardId: string,
): CardStatus {
  switch (status) {
    case 'active':
      return CardStatus.active
    case 'inactive':
      return CardStatus.inactive
    case 'canceled':
      return CardStatus.canceled
    default:
      new Logger('StripeCardMapping').warn(
        `Unknown Stripe card status "${status}" on ${cardId}, storing as inactive`,
      )
      return CardStatus.inactive
  }
}

/** Shared with ingestion, which gets expanded cards nested inside events. */
export function toProcessorCard(card: Stripe.Issuing.Card): ProcessorCard {
  return {
    stripeId: card.id,
    cardholderStripeId: card.cardholder.id,
    last4: card.last4,
    brand: card.brand,
    status: mapStripeCardStatus(card.status, card.id),
    currency: card.currency,
  }
}

export function toProcessorCardholder(cardholder: Stripe.Issuing.Cardholder): ProcessorCardholder {
  return {
    stripeId: cardholder.id,
    name: cardholder.name,
    email: cardholder.email,
  }
}

/**
 * Distinguishes "Stripe does not have this object" from every other failure. A
 * missing object is an answer; a network or auth failure is not, and must not be
 * swallowed into a null.
 */
function isResourceMissing(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    (error.code === 'resource_missing' || error.statusCode === 404)
  )
}
