import { join } from 'node:path'
import { defineConfig } from 'prisma/config'
// The Prisma CLI loads this file with a plain require that does not read tsconfig
// paths, so this is the one place in the workspace where the @/ alias cannot be
// used. Verified: importing '@/config/env' here fails to resolve.
import { requireEnv } from './src/config/env'

// The only caller that has to read the .env itself, because the Prisma CLI takes
// no --env-file flag. The relative path is safe here in a way it would not be
// under src/: this file must sit at the package root for the CLI to find it, and
// it is never compiled, so its depth cannot drift.
try {
  process.loadEnvFile(join(__dirname, '..', '..', '.env'))
} catch {
  // No .env present, so a deployment is injecting the environment directly.
}

export default defineConfig({
  // Anchored on __dirname so the CLI behaves the same whether it is invoked
  // through the workspace script or from the repo root.
  schema: join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: join(__dirname, 'prisma', 'migrations'),
    // No --env-file needed: `prisma migrate reset` spawns this as a child of the
    // CLI, which already has the environment loaded above.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Prisma 7 dropped `url` from the datasource block, so Migrate reads the
    // connection string from here.
    url: requireEnv('DATABASE_URL'),
  },
})
