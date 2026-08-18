import { Module } from '@nestjs/common'
import { CardholderModule } from '@/cardholder/cardholder.module'
import { InsightsController } from '@/insights/insights.controller'
import { InsightsRepository } from '@/insights/insights.repository'
import { InsightsService } from '@/insights/insights.service'

@Module({
  imports: [CardholderModule],
  controllers: [InsightsController],
  providers: [InsightsRepository, InsightsService],
})
export class InsightsModule {}
