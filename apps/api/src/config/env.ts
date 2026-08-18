/**
 * Reads a variable the process cannot run without, failing with a message that
 * says how to fix it rather than surfacing later as a connection error.
 *
 * Populating the environment is the launcher's job, not this module's: npm
 * scripts pass Node's --env-file, prisma.config.ts loads the file itself because
 * the Prisma CLI takes no such flag, and the Nest app uses @nestjs/config. That
 * keeps config out of the filesystem in production, where there is no .env and
 * the platform injects the environment directly.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`)
  }
  return value
}
