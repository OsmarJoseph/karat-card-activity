import { Injectable } from '@nestjs/common'
import { Prisma, type SpendCategory, type TransactionType } from '@prisma/client'
import type { ActivityCursor } from '@/activity/activity-cursor'
import { UNSETTLED_AUTHORIZATION } from '@/activity/unsettled-authorization'
import { PrismaService } from '@/prisma/prisma.service'

export const ACTIVITY_KINDS = ['authorization', 'transaction'] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

/** The `kind` filter: pending means authorizations, settled means transactions. */
export const ACTIVITY_FILTERS = ['all', 'pending', 'settled'] as const
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]

export interface ActivityFeedRow {
  id: string
  kind: ActivityKind
  amount: number
  currency: string
  merchantName: string
  category: SpendCategory
  occurredAt: Date
  /** Null on an authorization, which has not settled into a capture or a refund. */
  type: TransactionType | null
}

export interface ActivityFeedQuery {
  cardholderId: string
  limit: number
  cursor: ActivityCursor | null
  filter: ActivityFilter
  category: SpendCategory | null
}

export interface ActivityFeedPage {
  rows: ActivityFeedRow[]
  hasMore: boolean
}

// Both branches name their columns identically: UNION ALL requires it, and the first
// branch alone decides the output names once a filter drops the other.
function authorizationBranch(filters: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    SELECT
      id,
      'authorization' AS kind,
      amount,
      currency,
      merchant_name AS "merchantName",
      category::text AS category,
      occurred_at AS "occurredAt",
      NULL::text AS type
    FROM authorizations
    WHERE ${filters} AND ${UNSETTLED_AUTHORIZATION}
  `
}

function transactionBranch(filters: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    SELECT
      id,
      'transaction' AS kind,
      amount,
      currency,
      merchant_name AS "merchantName",
      category::text AS category,
      occurred_at AS "occurredAt",
      type::text AS type
    FROM transactions
    WHERE ${filters}
  `
}

@Injectable()
export class ActivityFeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One statement rather than two queries merged in memory, so Postgres can stop as
   * soon as it has enough rows. The row comparison `(occurred_at, id) < (…)` matches the
   * `(cardholder_id, occurred_at DESC, id DESC)` index, making paging a range scan.
   */
  async findPage(query: ActivityFeedQuery): Promise<ActivityFeedPage> {
    // Unqualified columns, so one fragment serves both branches.
    const filters = Prisma.sql`
      cardholder_id = ${query.cardholderId}::uuid
      ${
        query.cursor
          ? Prisma.sql`AND (occurred_at, id) < (${query.cursor.occurredAt}, ${query.cursor.id}::uuid)`
          : Prisma.empty
      }
      ${
        query.category
          ? Prisma.sql`AND category = ${query.category}::"SpendCategory"`
          : Prisma.empty
      }
    `

    const branches: Prisma.Sql[] = []
    if (query.filter !== 'settled') {
      branches.push(authorizationBranch(filters))
    }
    if (query.filter !== 'pending') {
      branches.push(transactionBranch(filters))
    }

    // One row past the page answers `hasMore` without a second count query.
    const rows = await this.prisma.$queryRaw<ActivityFeedRow[]>(Prisma.sql`
      ${Prisma.join(branches, ' UNION ALL ')}
      ORDER BY "occurredAt" DESC, id DESC
      LIMIT ${query.limit + 1}
    `)

    const hasMore = rows.length > query.limit
    return { rows: hasMore ? rows.slice(0, query.limit) : rows, hasMore }
  }
}
