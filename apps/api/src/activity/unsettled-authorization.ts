import { Prisma } from '@prisma/client'

/**
 * An authorization counts as activity only while it holds money no transaction has
 * taken over. Anything but `pending` is money that already moved or never will: Stripe
 * closes a declined swipe and reverses or expires a released hold. The `NOT EXISTS`
 * stops one purchase appearing twice, since a capture names its authorization and
 * either can arrive first.
 *
 * Shared by the feed and the pending metric so they cannot disagree. Columns are
 * unqualified, so callers must select from `authorizations` without an alias.
 */
export const UNSETTLED_AUTHORIZATION = Prisma.sql`
  status = 'pending'::"AuthorizationStatus"
  AND NOT EXISTS (
    SELECT 1 FROM transactions WHERE transactions.authorization_id = authorizations.stripe_id
  )
`
