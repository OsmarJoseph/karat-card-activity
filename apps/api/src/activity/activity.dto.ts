import { SpendCategory, TransactionType } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ACTIVITY_FILTERS, ACTIVITY_KINDS } from '@/activity/activity-feed.repository'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/** What the money is doing, as opposed to which Stripe object recorded it. */
const ACTIVITY_STATUSES = ['pending', 'settled'] as const

const activityQuerySchema = z.object({
  /** Opaque, from a previous page's `nextCursor`. */
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  kind: z.enum(ACTIVITY_FILTERS).default('all'),
  category: z.enum(SpendCategory).optional(),
})

const activityItemSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(ACTIVITY_KINDS),
    status: z.enum(ACTIVITY_STATUSES),
    /** Null on an authorization. Flat, not a union, since `kind` already discriminates. */
    type: z.enum(TransactionType).nullable(),
    /** Minor units, signed: negative is money returned. */
    amount: z.int(),
    currency: z.string(),
    formattedAmount: z.string(),
    merchantName: z.string(),
    category: z.enum(SpendCategory),
    /** Sent with the row so the label lives in one place rather than in every client. */
    categoryLabel: z.string(),
    occurredAt: z.iso.datetime(),
  })
  // The id names the OpenAPI component, and so the type Orval generates from it.
  .meta({ id: 'ActivityItem' })

const activityPageSchema = z
  .object({
    items: z.array(activityItemSchema),
    /** Null on the last page. */
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  })
  .meta({ id: 'ActivityPage' })

export class ActivityQueryDto extends createZodDto(activityQuerySchema) {}
export class ActivityPageDto extends createZodDto(activityPageSchema) {}

export type ActivityQuery = z.output<typeof activityQuerySchema>
export type ActivityItem = z.input<typeof activityItemSchema>
export type ActivityPage = z.input<typeof activityPageSchema>
