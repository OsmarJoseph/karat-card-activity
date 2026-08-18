import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'

/** Shared so the served spec and the emitted file cannot document different paths. */
export const API_PREFIX = 'api/v1'

export const DOCS_PATH = 'docs'

/**
 * The client contract. Orval generates the web app's types and hooks from this, so the
 * DTOs are written once. Must run after setGlobalPrefix.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const spec = new DocumentBuilder()
    .setTitle('Karat card activity')
    .setDescription('Card activity and spend insights for one Stripe Issuing cardholder.')
    .setVersion('1')
    // The prefix belongs to the server, not to every path. Declaring it here means the
    // generated client's paths are relative, so the client composes them with a base URL
    // that already carries the version instead of repeating it.
    .addServer(`/${API_PREFIX}`)
    .build()

  // cleanupOpenApiDoc resolves the zod schemas behind the DTOs into named components.
  return cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, spec, {
      // Paired with addServer above: without this the prefix appears twice, once in the
      // server URL and again on each path.
      ignoreGlobalPrefix: true,
      // Nest defaults to ControllerName_methodName, which reaches the browser as
      // useActivityControllerGetActivity. The method name alone reads as an API call.
      operationIdFactory: (_controllerKey, methodKey) => methodKey,
    }),
  )
}
