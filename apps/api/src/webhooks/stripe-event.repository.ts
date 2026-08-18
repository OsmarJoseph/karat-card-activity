import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import type Stripe from 'stripe'
import { PrismaService } from '@/prisma/prisma.service'

const MAX_ERROR_LENGTH = 1000

export type RecordOutcome = 'stored' | 'duplicate'

@Injectable()
export class StripeEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores an event once, keyed by Stripe's event id. Skipping conflicts on insert,
   * instead of reading then writing, stops two concurrent deliveries of the same
   * event both deciding they are first.
   */
  async record(event: Stripe.Event): Promise<RecordOutcome> {
    const result = await this.prisma.stripeEvent.createMany({
      data: [
        {
          id: event.id,
          type: event.type,
          // Plain JSON off the wire, but not typed as Prisma's JSON shape.
          payload: event as unknown as Prisma.InputJsonValue,
        },
      ],
      skipDuplicates: true,
    })

    // id is the only unique constraint, so a skipped row means this exact event id
    // has already been stored. Delivery is at-least-once, so that is normal traffic.
    return result.count === 1 ? 'stored' : 'duplicate'
  }

  async markProcessed(id: string): Promise<void> {
    await this.prisma.stripeEvent.update({
      where: { id },
      data: { processedAt: new Date(), lastError: null },
    })
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.prisma.stripeEvent.update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: error.slice(0, MAX_ERROR_LENGTH) },
    })
  }
}
