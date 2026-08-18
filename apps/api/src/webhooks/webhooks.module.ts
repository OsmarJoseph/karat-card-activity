import { Module } from '@nestjs/common'
import { ConfigModule } from '@/config/config.module'
import { StripeEventRepository } from '@/webhooks/stripe-event.repository'
import { StripeSignatureGuard } from '@/webhooks/stripe-signature.guard'
import { StripeWebhookController } from '@/webhooks/stripe-webhook.controller'

@Module({
  imports: [ConfigModule],
  controllers: [StripeWebhookController],
  providers: [StripeEventRepository, StripeSignatureGuard],
  // Exported for the replay command.
  exports: [StripeEventRepository],
})
export class WebhooksModule {}
