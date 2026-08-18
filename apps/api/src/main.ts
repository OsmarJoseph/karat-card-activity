import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import { AppModule } from '@/app.module'
import { AppConfigService } from '@/config/app-config.service'

const DOCS_PATH = 'docs'

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
  setupOpenApi(app)

  await app.listen(config.port)

  const logger = new Logger('Bootstrap')
  logger.log(`API listening on http://localhost:${config.port}/api/v1`)
  logger.log(`OpenAPI spec at http://localhost:${config.port}/api/v1/${DOCS_PATH}-json`)
}

/** Orval generates the client from this spec. Must run after setGlobalPrefix. */
function setupOpenApi(app: NestExpressApplication): void {
  const spec = new DocumentBuilder()
    .setTitle('Karat card activity')
    .setDescription('Card activity and spend insights for one Stripe Issuing cardholder.')
    .setVersion('1')
    .build()

  // cleanupOpenApiDoc resolves the zod schemas behind the DTOs into named components.
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, spec))
  SwaggerModule.setup(DOCS_PATH, app, document, { useGlobalPrefix: true })
}

void bootstrap()
