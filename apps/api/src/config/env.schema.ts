import { z } from 'zod'

/**
 * Every setting the API needs, validated once at bootstrap so a missing or
 * malformed value stops the process immediately instead of surfacing later as a
 * connection error or a silently wrong Stripe call.
 *
 * Unknown keys are stripped rather than rejected, because process.env carries
 * hundreds of variables that are none of our business.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z
    .string()
    .startsWith('postgres', 'must be a Postgres connection string, e.g. postgresql://…'),

  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  /** Comma separated in the file, a list everywhere else. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),

  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'must be a Stripe secret key (sk_…)'),

  /** Printed by `stripe listen`. Without it every webhook fails signature checks. */
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith('whsec_', 'must be a Stripe webhook secret (whsec_…)'),

  /**
   * The single cardholder this deployment serves. There is no login in v1, so the
   * identity that would come from a session comes from configuration instead.
   */
  CARDHOLDER_STRIPE_ID: z.string().startsWith('ich_', 'must be a Stripe cardholder id (ich_…)'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Passed to ConfigModule.forRoot as its `validate` hook. Reports every problem at
 * once, since fixing configuration one error per restart is miserable.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw)

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${problems}`)
  }

  return result.data
}
