import { Module } from '@nestjs/common'
import { CurrentCardholderService } from '@/cardholder/current-cardholder.service'
import { ConfigModule } from '@/config/config.module'

@Module({
  imports: [ConfigModule],
  providers: [CurrentCardholderService],
  exports: [CurrentCardholderService],
})
export class CardholderModule {}
