import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from '@/app.module'
import { AppConfigService } from '@/config/app-config.service'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Stripe signs the exact bytes it sent, so the untouched buffer has to survive
    // JSON parsing for the webhook signature check to be possible at all.
    rawBody: true,
  })

  const config = app.get(AppConfigService)

  app.setGlobalPrefix('api/v1')
  app.enableCors({
    // Spread because the config exposes a readonly array.
    origin: [...config.corsOrigins],
    methods: ['GET'],
  })
  // Without this, onModuleDestroy never runs and the Postgres pool is left open.
  app.enableShutdownHooks()

  await app.listen(config.port)
  new Logger('Bootstrap').log(`API listening on http://localhost:${config.port}/api/v1`)
}

void bootstrap()
