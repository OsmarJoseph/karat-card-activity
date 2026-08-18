import {
  BadRequestException,
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  type RawBodyRequest,
} from '@nestjs/common'
import type { Request } from 'express'
import Stripe from 'stripe'
import { AppConfigService } from '@/config/app-config.service'

const VERIFIED_EVENT = Symbol('verifiedStripeEvent')

export type StripeWebhookRequest = RawBodyRequest<Request> & {
  [VERIFIED_EVENT]?: Stripe.Event
}

export function verifiedStripeEvent(request: StripeWebhookRequest): Stripe.Event {
  const event = request[VERIFIED_EVENT]
  if (!event) {
    // Missing means the guard is not attached, which is a wiring bug.
    throw new Error('No verified Stripe event on the request. Is StripeSignatureGuard applied?')
  }
  return event
}

/**
 * Checks Stripe's signature over the exact bytes received. Verification needs only
 * the webhook secret, so this holds no Stripe client, and it hands the parsed event
 * to the controller rather than parsing twice.
 */
@Injectable()
export class StripeSignatureGuard implements CanActivate {
  private readonly logger = new Logger(StripeSignatureGuard.name)

  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<StripeWebhookRequest>()
    const signature = request.headers['stripe-signature']

    if (!request.rawBody) {
      throw new BadRequestException('Raw request body unavailable')
    }
    if (typeof signature !== 'string') {
      throw new BadRequestException('Missing stripe-signature header')
    }

    try {
      request[VERIFIED_EVENT] = Stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        this.config.stripeWebhookSecret,
      )
      return true
    } catch (error: unknown) {
      // Reason logged, generic message returned, so the response cannot be probed.
      this.logger.warn(
        `Rejected webhook: ${error instanceof Error ? error.message : 'unknown failure'}`,
      )
      throw new BadRequestException('Invalid Stripe signature')
    }
  }
}
