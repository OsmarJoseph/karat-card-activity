import { Injectable } from '@nestjs/common'
import { Prisma, type SpendCategory } from '@prisma/client'
import { UNSETTLED_AUTHORIZATION } from '@/activity/unsettled-authorization'
import type { ResolvedPeriod } from '@/insights/spend-period'
import { PrismaService } from '@/prisma/prisma.service'

export interface SettledTotals {
  /** Captures minus refunds, which the signed amounts make a plain sum. */
  settledSpend: number
  transactionCount: number
  previousSettledSpend: number
}

export interface CategoryTotal {
  category: SpendCategory
  amount: number
  count: number
}

export interface PendingTotals {
  count: number
  amount: number
}

/** Postgres answers SUM and COUNT as bigint whatever the column width. */
type Aggregated<T> = { [K in keyof T]: T[K] extends number ? bigint : T[K] }

@Injectable()
export class InsightsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `FILTER` splits both windows inside one index scan, so they see one snapshot. */
  async findSettledTotals(cardholderId: string, period: ResolvedPeriod): Promise<SettledTotals> {
    // A tuple, because an aggregate with no GROUP BY always returns exactly one row.
    const [row] = await this.prisma.$queryRaw<[Aggregated<SettledTotals>]>`
      SELECT
        COALESCE(SUM(amount) FILTER (
          WHERE occurred_at >= ${period.start} AND occurred_at < ${period.end}
        ), 0) AS "settledSpend",
        COUNT(*) FILTER (
          WHERE occurred_at >= ${period.start} AND occurred_at < ${period.end}
        ) AS "transactionCount",
        COALESCE(SUM(amount) FILTER (
          WHERE occurred_at >= ${period.previous.start} AND occurred_at < ${period.previous.end}
        ), 0) AS "previousSettledSpend"
      FROM transactions
      WHERE cardholder_id = ${cardholderId}::uuid
        AND occurred_at >= ${period.previous.start}
        AND occurred_at < ${period.end}
    `

    return {
      settledSpend: Number(row.settledSpend),
      transactionCount: Number(row.transactionCount),
      previousSettledSpend: Number(row.previousSettledSpend),
    }
  }

  async findCategoryTotals(cardholderId: string, period: ResolvedPeriod): Promise<CategoryTotal[]> {
    const rows = await this.prisma.$queryRaw<Array<Aggregated<CategoryTotal>>>`
      SELECT category::text AS category, SUM(amount) AS amount, COUNT(*) AS count
      FROM transactions
      WHERE cardholder_id = ${cardholderId}::uuid
        AND occurred_at >= ${period.start}
        AND occurred_at < ${period.end}
      GROUP BY category
      ORDER BY SUM(amount) DESC
    `

    return rows.map((row) => ({
      category: row.category,
      amount: Number(row.amount),
      count: Number(row.count),
    }))
  }

  /** Deliberately not period-scoped: pending is a statement about the present. */
  async findPendingTotals(cardholderId: string): Promise<PendingTotals> {
    const [row] = await this.prisma.$queryRaw<[Aggregated<PendingTotals>]>(Prisma.sql`
      SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
      FROM authorizations
      WHERE cardholder_id = ${cardholderId}::uuid AND ${UNSETTLED_AUTHORIZATION}
    `)

    return { count: Number(row.count), amount: Number(row.amount) }
  }
}
