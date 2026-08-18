import { Logger } from '@nestjs/common'
import { AuthorizationStatus, type Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import {
  fromUnixSeconds,
  mapMerchant,
  type NormalizedAuthorization,
  type NormalizedEvent,
} from '@/ingestion/normalized'
import { toProcessorCard, toProcessorCardholder } from '@/processor/stripe-card-processor'

const logger = new Logger('AuthorizationNormalizer')

/**
 * Stripe reserves the right to add statuses. An unknown one is recorded as expired
 * rather than pending, because pending is what the feed and the pending tile read,
 * and inventing pending spend is worse than under-reporting it.
 */
function mapStatus(status: Stripe.Issuing.Authorization.Status, id: string): AuthorizationStatus {
  switch (status) {
    case 'pending':
      return AuthorizationStatus.pending
    case 'closed':
      return AuthorizationStatus.closed
    case 'reversed':
      return AuthorizationStatus.reversed
    case 'expired':
      return AuthorizationStatus.expired
    default:
      logger.warn(`Unknown Stripe authorization status "${status}" on ${id}, storing as expired`)
      return AuthorizationStatus.expired
  }
}

/**
 * An authorization always arrives with its card expanded, and the card carries its
 * cardholder, so this needs no network call.
 */
export function normalizeAuthorization(
  event: Stripe.Event,
  authorization: Stripe.Issuing.Authorization,
): NormalizedEvent<NormalizedAuthorization> {
  const card = authorization.card

  return {
    cardStripeId: card.id,
    card: toProcessorCard(card),
    cardholder: toProcessorCardholder(card.cardholder),
    activity: {
      stripeId: authorization.id,
      // An authorization is always a request to spend, so it is positive here.
      // Absolute value guards against a sign we did not expect.
      amount: Math.abs(authorization.amount),
      currency: authorization.currency,
      status: mapStatus(authorization.status, authorization.id),
      ...mapMerchant(authorization.merchant_data),
      occurredAt: fromUnixSeconds(authorization.created),
      lastEventAt: fromUnixSeconds(event.created),
      raw: authorization as unknown as Prisma.InputJsonValue,
    },
  }
}
