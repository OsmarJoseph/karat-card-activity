import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { SwaggerModule } from '@nestjs/swagger'
import { AppModule } from '@/app.module'
import { AppConfigService } from '@/config/app-config.service'
import { API_PREFIX, DOCS_PATH, buildOpenApiDocument } from '@/openapi'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Stripe signs the exact bytes it sent, so the untouched buffer has to survive
    // JSON parsing for the webhook signature check to be possible at all.
    rawBody: true,
  })

  const config = app.get(AppConfigService)

  app.setGlobalPrefix(API_PREFIX)
  app.enableCors({
    // Spread because the config exposes a readonly array.
    origin: [...config.corsOrigins],
    methods: ['GET'],
  })
  // Without this, onModuleDestroy never runs and the Postgres pool is left open.
  app.enableShutdownHooks()
  SwaggerModule.setup(DOCS_PATH, app, buildOpenApiDocument(app), { useGlobalPrefix: true })

  await app.listen(config.port)

  const logger = new Logger('Bootstrap')
  logger.log(`API listening on http://localhost:${config.port}/${API_PREFIX}`)
  logger.log(`OpenAPI spec at http://localhost:${config.port}/${API_PREFIX}/${DOCS_PATH}-json`)
}

void bootstrap()
