export const INSIGHT_PERIODS = ['current_month', 'last_30d', 'last_90d'] as const
export type InsightPeriod = (typeof INSIGHT_PERIODS)[number]

export interface DateRange {
  start: Date
  /** Exclusive, so adjacent windows never both claim a row. */
  end: Date
}

/** How the trend is bucketed. Ninety daily bars are unreadable, so long periods widen. */
export const SPEND_BUCKETS = ['day', 'week'] as const
export type SpendBucket = (typeof SPEND_BUCKETS)[number]

export interface ResolvedPeriod extends DateRange {
  label: string
  bucket: SpendBucket
  /** The comparable stretch immediately before, for the change figure. */
  previous: DateRange
}

/** UTC until the server knows the cardholder's own zone. */
const PERIOD_TIME_ZONE = 'UTC'

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: PERIOD_TIME_ZONE,
})

const DAY_MS = 24 * 60 * 60 * 1000

/** Total by design: a rolling period cannot be added without a length. */
const ROLLING_DAYS: Record<Exclude<InsightPeriod, 'current_month'>, number> = {
  last_30d: 30,
  last_90d: 90,
}

const BUCKETS: Record<InsightPeriod, SpendBucket> = {
  current_month: 'day',
  last_30d: 'day',
  last_90d: 'week',
}

/** Pure and taking `now`, so the boundaries are testable without moving the clock. */
export function resolvePeriod(period: InsightPeriod, now: Date): ResolvedPeriod {
  if (period === 'current_month') {
    const start = startOfUtcMonth(now, 0)
    const previousStart = startOfUtcMonth(now, -1)
    const elapsed = now.getTime() - start.getTime()

    return {
      start,
      end: now,
      label: MONTH_LABEL.format(start),
      bucket: BUCKETS[period],
      previous: {
        start: previousStart,
        // The same stretch of the previous month, so a third of August is not measured
        // against the whole of July. Clamped, because a long month compared against a
        // short one would otherwise reach into the current period.
        end: new Date(Math.min(previousStart.getTime() + elapsed, start.getTime())),
      },
    }
  }

  const days = ROLLING_DAYS[period]
  const span = days * DAY_MS
  const start = new Date(now.getTime() - span)

  return {
    start,
    end: now,
    label: `Last ${days} days`,
    bucket: BUCKETS[period],
    previous: { start: new Date(start.getTime() - span), end: start },
  }
}

function startOfUtcMonth(instant: Date, monthOffset: number): Date {
  // Date.UTC normalizes the month, so -1 in January is last December.
  return new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth() + monthOffset, 1))
}
