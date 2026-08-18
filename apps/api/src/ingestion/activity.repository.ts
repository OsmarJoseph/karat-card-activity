import { Injectable } from '@nestjs/common'
import type { NormalizedAuthorization, NormalizedTransaction } from '@/ingestion/normalized'
import { PrismaService } from '@/prisma/prisma.service'
import type { ProcessorCard, ProcessorCardholder } from '@/processor/card-processor'

/** `stale` means a newer event already wrote this row, so this one was discarded. */
export type UpsertOutcome = 'applied' | 'stale'

export interface CardRef {
  id: string
  cardholderId: string
}

const PLACEHOLDER_CARDHOLDER_NAME = 'Unknown cardholder'

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCard(stripeId: string): Promise<CardRef | null> {
    return this.prisma.card.findUnique({
      where: { stripeId },
      select: { id: true, cardholderId: true },
    })
  }

  async ensureCardholder(
    cardholder: ProcessorCardholder | null,
    stripeId: string,
  ): Promise<string> {
    const name = cardholder?.name ?? PLACEHOLDER_CARDHOLDER_NAME
    const email = cardholder?.email ?? null

    const row = await this.prisma.cardholder.upsert({
      where: { stripeId: cardholder?.stripeId ?? stripeId },
      create: { stripeId: cardholder?.stripeId ?? stripeId, name, email },
      update: { name, email },
      select: { id: true },
    })
    return row.id
  }

  ensureCard(card: ProcessorCard, cardholderId: string): Promise<CardRef> {
    const fields = {
      last4: card.last4,
      brand: card.brand,
      status: card.status,
      currency: card.currency,
      cardholderId,
    }
    return this.prisma.card.upsert({
      where: { stripeId: card.stripeId },
      create: { stripeId: card.stripeId, ...fields },
      update: fields,
      select: { id: true, cardholderId: true },
    })
  }

  /**
   * Writes the row only if this event is at least as new as whatever is already
   * there, in one statement, so a replayed or out-of-order delivery cannot regress
   * newer data. Doing it as a conditional ON CONFLICT rather than read-then-write is
   * what makes it safe under concurrent delivery of the same object.
   *
   * `<=` rather than `<` because Stripe event timestamps are whole seconds: two
   * genuine updates can share one, and the later delivery should win.
   */
  async upsertAuthorization(
    activity: NormalizedAuthorization,
    card: CardRef,
  ): Promise<UpsertOutcome> {
    const affected = await this.prisma.$executeRaw`
      INSERT INTO authorizations (
        stripe_id, card_id, cardholder_id, amount, currency, status,
        merchant_name, merchant_mcc, merchant_category, category,
        occurred_at, last_event_at, raw
      ) VALUES (
        ${activity.stripeId}, ${card.id}::uuid, ${card.cardholderId}::uuid,
        ${activity.amount}, ${activity.currency}, ${activity.status}::"AuthorizationStatus",
        ${activity.merchantName}, ${activity.merchantMcc}, ${activity.merchantCategory},
        ${activity.category}::"SpendCategory",
        ${activity.occurredAt}, ${activity.lastEventAt}, ${JSON.stringify(activity.raw)}::jsonb
      )
      ON CONFLICT (stripe_id) DO UPDATE SET
        card_id = EXCLUDED.card_id,
        cardholder_id = EXCLUDED.cardholder_id,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        merchant_name = EXCLUDED.merchant_name,
        merchant_mcc = EXCLUDED.merchant_mcc,
        merchant_category = EXCLUDED.merchant_category,
        category = EXCLUDED.category,
        occurred_at = EXCLUDED.occurred_at,
        last_event_at = EXCLUDED.last_event_at,
        raw = EXCLUDED.raw
      WHERE authorizations.last_event_at <= EXCLUDED.last_event_at
    `
    return affected === 1 ? 'applied' : 'stale'
  }

  /** Same guard as authorizations. See upsertAuthorization. */
  async upsertTransaction(activity: NormalizedTransaction, card: CardRef): Promise<UpsertOutcome> {
    const affected = await this.prisma.$executeRaw`
      INSERT INTO transactions (
        stripe_id, authorization_id, card_id, cardholder_id, amount, currency, type,
        merchant_name, merchant_mcc, merchant_category, category,
        occurred_at, last_event_at, raw
      ) VALUES (
        ${activity.stripeId}, ${activity.authorizationStripeId}, ${card.id}::uuid,
        ${card.cardholderId}::uuid, ${activity.amount}, ${activity.currency},
        ${activity.type}::"TransactionType",
        ${activity.merchantName}, ${activity.merchantMcc}, ${activity.merchantCategory},
        ${activity.category}::"SpendCategory",
        ${activity.occurredAt}, ${activity.lastEventAt}, ${JSON.stringify(activity.raw)}::jsonb
      )
      ON CONFLICT (stripe_id) DO UPDATE SET
        authorization_id = EXCLUDED.authorization_id,
        card_id = EXCLUDED.card_id,
        cardholder_id = EXCLUDED.cardholder_id,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        type = EXCLUDED.type,
        merchant_name = EXCLUDED.merchant_name,
        merchant_mcc = EXCLUDED.merchant_mcc,
        merchant_category = EXCLUDED.merchant_category,
        category = EXCLUDED.category,
        occurred_at = EXCLUDED.occurred_at,
        last_event_at = EXCLUDED.last_event_at,
        raw = EXCLUDED.raw
      WHERE transactions.last_event_at <= EXCLUDED.last_event_at
    `
    return affected === 1 ? 'applied' : 'stale'
  }
}
