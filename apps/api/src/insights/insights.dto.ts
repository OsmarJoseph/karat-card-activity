import { SpendCategory } from '@prisma/client'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { INSIGHT_PERIODS, SPEND_BUCKETS } from '@/insights/spend-period'

const insightsQuerySchema = z.object({
  period: z.enum(INSIGHT_PERIODS).default('current_month'),
})

const periodSchema = z
  .object({
    start: z.iso.datetime(),
    /** Exclusive: the moment of the request, for a period that includes today. */
    end: z.iso.datetime(),
    label: z.string(),
  })
  .meta({ id: 'InsightsPeriod' })

const metricsSchema = z
  .object({
    /** Minor units. Captures minus refunds over the period. */
    settledSpend: z.int(),
    transactionCount: z.int(),
    averageTransaction: z.int(),
    previousPeriodSettledSpend: z.int(),
    /** Null when the previous period had no spend to measure against. */
    changePercent: z.number().nullable(),
  })
  .meta({ id: 'InsightsMetrics' })

const pendingSchema = z
  .object({
    count: z.int(),
    amount: z.int(),
  })
  .meta({ id: 'PendingTotals' })

const breakdownItemSchema = z
  .object({
    category: z.enum(SpendCategory),
    label: z.string(),
    amount: z.int(),
    /** Share of settled spend, to two decimal places. */
    percent: z.number(),
    count: z.int(),
  })
  .meta({ id: 'SpendBreakdownItem' })

const spendTrendSchema = z
  .object({
    bucket: z.enum(SPEND_BUCKETS),
    /** Unbroken and ascending, including buckets with no spend. */
    points: z.array(
      z.object({
        startsAt: z.iso.datetime(),
        amount: z.int(),
      }),
    ),
  })
  .meta({ id: 'SpendTrend' })

const insightsSchema = z
  .object({
    period: periodSchema,
    metrics: metricsSchema,
    /** Money on hold now, which does not move when the period changes. */
    pending: pendingSchema,
    /** Largest first, and only categories with activity in the period. */
    breakdown: z.array(breakdownItemSchema),
    trend: spendTrendSchema,
  })
  .meta({ id: 'Insights' })

export class InsightsQueryDto extends createZodDto(insightsQuerySchema) {}
export class InsightsDto extends createZodDto(insightsSchema) {}

export type InsightsQuery = z.output<typeof insightsQuerySchema>
export type Insights = z.input<typeof insightsSchema>
