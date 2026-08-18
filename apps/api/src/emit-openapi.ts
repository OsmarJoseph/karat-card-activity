import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '@/app.module'
import { API_PREFIX, buildOpenApiDocument } from '@/openapi'

/** Committed at the repo's api workspace root, next to the schema it describes. */
const OUTPUT = join(__dirname, '..', 'openapi.json')

async function main(): Promise<void> {
  // Preview mode builds the module graph without instantiating providers, so the spec
  // is emitted with no database, no Stripe client and no listening socket.
  const app = await NestFactory.create(AppModule, { preview: true, logger: false })
  app.setGlobalPrefix(API_PREFIX)

  writeFileSync(OUTPUT, `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`)
  await app.close()

  console.log(`wrote ${OUTPUT}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
