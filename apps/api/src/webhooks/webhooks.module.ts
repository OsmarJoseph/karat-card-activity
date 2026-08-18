import { Module } from '@nestjs/common'
import { ActivityEventsModule } from '@/activity/activity-events.module'
import { ConfigModule } from '@/config/config.module'
import { IngestionModule } from '@/ingestion/ingestion.module'
import { StripeEventRepository } from '@/webhooks/stripe-event.repository'
import { StripeSignatureGuard } from '@/webhooks/stripe-signature.guard'
import { StripeWebhookController } from '@/webhooks/stripe-webhook.controller'

@Module({
  imports: [ConfigModule, IngestionModule, ActivityEventsModule],
  controllers: [StripeWebhookController],
  providers: [StripeEventRepository, StripeSignatureGuard],
})
export class WebhooksModule {}
