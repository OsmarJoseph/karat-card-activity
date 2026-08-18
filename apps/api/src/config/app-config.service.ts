import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '@/config/env.schema'

/**
 * Typed access to validated configuration. Consumers ask for `databaseUrl`
 * rather than a string key, so a renamed variable is a compile error instead of
 * an undefined at runtime.
 *
 * The `true` generic tells ConfigService the values passed validation, which is
 * what makes these getters non-nullable.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true })
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production'
  }

  get port(): number {
    return this.config.get('PORT', { infer: true })
  }

  get corsOrigins(): readonly string[] {
    return this.config.get('CORS_ORIGINS', { infer: true })
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true })
  }

  get stripeSecretKey(): string {
    return this.config.get('STRIPE_SECRET_KEY', { infer: true })
  }

  get stripeWebhookSecret(): string {
    return this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true })
  }

  get cardholderStripeId(): string {
    return this.config.get('CARDHOLDER_STRIPE_ID', { infer: true })
  }
}
