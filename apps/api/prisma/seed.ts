import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
// Relative, like prisma.config.ts: tsx resolves the @/ alias from cwd rather
// than from this file, so the alias would break if the seed ran from anywhere
// but apps/api. The environment itself arrives via --env-file in the db:seed
// script, so nothing here touches the filesystem.
import { requireEnv } from '../src/config/env'

/**
 * Seeds only the one cardholder this deployment serves, which is the row every
 * ingested authorization and transaction needs a foreign key to.
 *
 * Cards are deliberately not seeded. Their ids have to be the real Stripe ids
 * for incoming webhooks to match, so they are backfilled from Stripe instead.
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
  })

  try {
    const stripeId = requireEnv('CARDHOLDER_STRIPE_ID')
    const cardholder = await prisma.cardholder.upsert({
      where: { stripeId },
      // Stripe is the system of record, so these placeholders last only until the
      // first cardholder event or backfill overwrites them.
      create: {
        stripeId,
        name: 'Awaiting Stripe sync',
        email: 'awaiting-sync@example.invalid',
      },
      // Re-running the seed must not clobber synced data.
      update: {},
    })

    console.log(`cardholder ready: ${cardholder.stripeId} -> ${cardholder.id}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
