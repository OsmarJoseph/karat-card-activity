import { Controller, HttpCode, HttpStatus, Logger, Post, Req, UseGuards } from '@nestjs/common'
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

  constructor(private readonly events: StripeEventRepository) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(StripeSignatureGuard)
  async receive(@Req() request: StripeWebhookRequest): Promise<WebhookAck> {
    const event = verifiedStripeEvent(request)

    const outcome = await this.events.record(event)
    if (outcome === 'duplicate') {
      this.logger.log(`Duplicate ${event.type} ${event.id}, already stored`)
      return { received: true, duplicate: true }
    }

    // Normalizing into the read model is the next phase; the event is durable now.
    this.logger.log(`Stored ${event.type} ${event.id}`)
    return { received: true, duplicate: false }
  }
}
