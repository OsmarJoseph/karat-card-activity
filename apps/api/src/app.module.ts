import { Module } from '@nestjs/common'
import { ConfigModule } from '@/config/config.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { ProcessorModule } from '@/processor/processor.module'
import { WebhooksModule } from '@/webhooks/webhooks.module'

@Module({
  imports: [ConfigModule, PrismaModule, ProcessorModule, WebhooksModule],
})
export class AppModule {}
