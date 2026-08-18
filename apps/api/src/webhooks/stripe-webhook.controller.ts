import { Controller, HttpCode, HttpStatus, Logger, Post, Req, UseGuards } from '@nestjs/common'
import { IngestionService } from '@/ingestion/ingestion.service'
import { StripeEventRepository } from '@/webhooks/stripe-event.repository'
import {
  StripeSignatureGuard,
  type StripeWebhookRequest,
  verifiedStripeEvent,
} from '@/webhooks/stripe-signature.guard'

export interface WebhookAck {
  received: true
  duplicate: boolean
}

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name)

  constructor(
    private readonly events: StripeEventRepository,
    private readonly ingestion: IngestionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(StripeSignatureGuard)
  async receive(@Req() request: StripeWebhookRequest): Promise<WebhookAck> {
    const event = verifiedStripeEvent(request)

    const outcome = await this.events.record(event)
    const duplicate = outcome === 'duplicate'

    // A duplicate is still normalized. The upsert is guarded, so redoing it is a
    // no-op, and that makes Stripe's redelivery the retry for an attempt that
    // stored the event but failed before normalizing it.
    try {
      const result = await this.ingestion.ingest(event)
      await this.events.markProcessed(event.id)
      this.logger.log(`${duplicate ? 'Replayed' : 'Received'} ${event.type} ${event.id}: ${result}`)
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown failure'
      await this.events.markFailed(event.id, reason)
      // Rethrown so Stripe redelivers. Either way the stored event keeps its failure
      // reason, so a payload we could not handle is inspectable rather than lost.
      this.logger.error(`Failed ${event.type} ${event.id}: ${reason}`)
      throw error
    }

    return { received: true, duplicate }
  }
}
