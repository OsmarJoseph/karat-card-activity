import { Module } from '@nestjs/common'
import { ConfigModule } from '@/config/config.module'
import { CARD_PROCESSOR } from '@/processor/card-processor'
import { StripeCardProcessor } from '@/processor/stripe-card-processor'

/**
 * Binds the port to the Stripe adapter. Consumers inject the CARD_PROCESSOR
 * token, never the concrete class, so the test suite can bind a fake instead.
 */
@Module({
  imports: [ConfigModule],
  providers: [{ provide: CARD_PROCESSOR, useClass: StripeCardProcessor }],
  exports: [CARD_PROCESSOR],
})
export class ProcessorModule {}
