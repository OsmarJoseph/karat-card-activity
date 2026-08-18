import { Inject, Injectable, Logger } from '@nestjs/common'
import type Stripe from 'stripe'
import { normalizeAuthorization } from '@/ingestion/authorization.normalizer'
import {
  type CardRef,
  ActivityRepository,
  type UpsertOutcome,
} from '@/ingestion/activity.repository'
import type { NormalizedEvent } from '@/ingestion/normalized'
import { normalizeTransaction } from '@/ingestion/transaction.normalizer'
import { CARD_PROCESSOR, type CardProcessor } from '@/processor/card-processor'
import { toProcessorCard, toProcessorCardholder } from '@/processor/stripe-card-processor'

/** `unsupported` is a deliberate skip, not a failure. */
export type IngestOutcome = UpsertOutcome | 'unsupported'

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name)

  constructor(
    private readonly activity: ActivityRepository,
    @Inject(CARD_PROCESSOR) private readonly processor: CardProcessor,
  ) {}

  async ingest(event: Stripe.Event): Promise<IngestOutcome> {
    switch (event.type) {
      case 'issuing_authorization.created':
      case 'issuing_authorization.updated': {
        const normalized = normalizeAuthorization(event, event.data.object)
        return this.activity.upsertAuthorization(
          normalized.activity,
          await this.resolveCard(normalized),
        )
      }

      case 'issuing_transaction.created':
      case 'issuing_transaction.updated': {
        const normalized = normalizeTransaction(event, event.data.object)
        return this.activity.upsertTransaction(
          normalized.activity,
          await this.resolveCard(normalized),
        )
      }

      case 'issuing_card.created':
      case 'issuing_card.updated': {
        const card = event.data.object
        const cardholderId = await this.activity.ensureCardholder(
          toProcessorCardholder(card.cardholder),
          card.cardholder.id,
        )
        await this.activity.ensureCard(toProcessorCard(card), cardholderId)
        return 'applied'
      }

      default:
        this.logger.debug(`Ignoring ${event.type}`)
        return 'unsupported'
    }
  }

  /**
   * Activity rows carry a real foreign key to a card, so the card and its cardholder
   * have to exist first. Three sources, cheapest first: already stored, expanded
   * inside the event, or fetched from the processor. Only a transaction with an
   * unexpanded card reaches that last case, which is the one network call ingestion
   * can make.
   */
  private async resolveCard(normalized: NormalizedEvent<unknown>): Promise<CardRef> {
    const stored = await this.activity.findCard(normalized.cardStripeId)
    if (stored) {
      return stored
    }

    const card = normalized.card ?? (await this.processor.getCard(normalized.cardStripeId))
    if (!card) {
      throw new Error(`Card ${normalized.cardStripeId} is unknown to the processor`)
    }

    let cardholder = normalized.cardholder
    if (!cardholder) {
      cardholder = await this.processor.getCardholder(card.cardholderStripeId)
      if (!cardholder) {
        this.logger.warn(
          `Cardholder ${card.cardholderStripeId} is unknown to the processor, storing a placeholder`,
        )
      }
    }

    const cardholderId = await this.activity.ensureCardholder(cardholder, card.cardholderStripeId)
    return this.activity.ensureCard(card, cardholderId)
  }
}
