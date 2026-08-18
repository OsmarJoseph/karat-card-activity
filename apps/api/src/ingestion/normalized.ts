import type { AuthorizationStatus, Prisma, SpendCategory, TransactionType } from '@prisma/client'
import type Stripe from 'stripe'
import { mapMccToCategory } from '@/ingestion/category-mapper'
import type { ProcessorCard, ProcessorCardholder } from '@/processor/card-processor'

/** Shown in the feed when Stripe sends no merchant name, which it permits. */
const UNKNOWN_MERCHANT = 'Unknown merchant'

interface NormalizedActivity {
  stripeId: string
  /** Minor units, always an integer. Positive is money spent, negative is returned. */
  amount: number
  currency: string
  merchantName: string
  merchantMcc: string
  merchantCategory: string
  category: SpendCategory
  occurredAt: Date
  /** The event's own timestamp, which decides whether this write wins. */
  lastEventAt: Date
  raw: Prisma.InputJsonValue
}

export interface NormalizedAuthorization extends NormalizedActivity {
  status: AuthorizationStatus
}

export interface NormalizedTransaction extends NormalizedActivity {
  type: TransactionType
  /** Stripe's authorization id, absent on an unlinked refund. */
  authorizationStripeId: string | null
}

/**
 * A normalized event plus the card it hangs off, which has to exist first because
 * `card_id` is a real foreign key.
 *
 * `card` and `cardholder` are null when Stripe sent only a card id instead of the
 * expanded object, which happens on transactions. Fetching the rest is the
 * ingestion service's job, so the normalizers stay pure and synchronous.
 *
 * The cardholder is deliberately not on the activity itself: once the card row
 * exists it already carries `cardholder_id`.
 */
export interface NormalizedEvent<T> {
  cardStripeId: string
  card: ProcessorCard | null
  cardholder: ProcessorCardholder | null
  activity: T
}

type StripeMerchantData =
  Stripe.Issuing.Authorization.MerchantData | Stripe.Issuing.Transaction.MerchantData

export function mapMerchant(
  data: StripeMerchantData,
): Pick<NormalizedActivity, 'merchantName' | 'merchantMcc' | 'merchantCategory' | 'category'> {
  return {
    merchantName: data.name ?? UNKNOWN_MERCHANT,
    merchantMcc: data.category_code,
    merchantCategory: data.category,
    category: mapMccToCategory(data.category_code),
  }
}

/** Every Stripe timestamp is unix seconds. */
export function fromUnixSeconds(seconds: number): Date {
  return new Date(seconds * 1000)
}
