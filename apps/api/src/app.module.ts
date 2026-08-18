import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod'
import { ActivityModule } from '@/activity/activity.module'
import { ConfigModule } from '@/config/config.module'
import { IngestionModule } from '@/ingestion/ingestion.module'
import { InsightsModule } from '@/insights/insights.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { ProcessorModule } from '@/processor/processor.module'
import { WebhooksModule } from '@/webhooks/webhooks.module'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ProcessorModule,
    IngestionModule,
    WebhooksModule,
    ActivityModule,
    InsightsModule,
  ],
  providers: [
    // A query string is all strings, so each DTO coerces and validates its own params.
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    // The other half of @ZodResponse: the declared schema is what leaves the process.
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
