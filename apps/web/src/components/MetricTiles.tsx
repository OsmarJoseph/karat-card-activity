import type { Insights } from '@/api/generated'
import { Skeleton } from '@/components/Skeleton'
import { formatMoney, formatPercent } from '@/lib/format'

/** The hairlines between cells are the grid's own gaps, letting the strip's background through. */
const STRIP =
  'grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card lg:grid-cols-[1.4fr_1fr_1fr_1fr]'
const CELL = 'bg-surface p-5 sm:p-6'
const WIDE = 'col-span-2 lg:col-span-1'
const LABEL = 'text-xs font-medium text-muted'
const VALUE = 'mt-2.5 text-2xl leading-none font-semibold tracking-tight tabular-nums'
const NOTE = 'mt-2.5 text-xs text-muted'

/**
 * Spending more than the period before is not a fault, so the change reads neutral. Amber
 * on this page means one thing only: an authorization still on hold.
 */
function Change({ percent }: { percent: number }) {
  const shape =
    percent > 0
      ? 'M5 8.6V1.6M1.9 4.7 5 1.6l3.1 3.1'
      : percent < 0
        ? 'M5 1.4v7M8.1 5.3 5 8.4 1.9 5.3'
        : 'M1.6 5h6.8'

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-sunk px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
      <svg viewBox="0 0 10 10" className="size-2.5" fill="none" aria-hidden="true">
        <path
          d={shape}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="tabular-nums">{formatPercent(Math.abs(percent))}</span>
    </span>
  )
}

/** Says something the other cells do not repeat, rather than restating the period. */
function describeCategories(count: number): string {
  if (count === 0) {
    return 'nothing settled yet'
  }
  return count === 1 ? 'across 1 category' : `across ${count} categories`
}

export function MetricTiles({ insights }: { insights: Insights | undefined }) {
  if (!insights) {
    return (
      <div className={STRIP}>
        <div className={`${CELL} ${WIDE}`}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3.5 h-8 w-40" />
          <Skeleton className="mt-3.5 h-3 w-28" />
        </div>
        {[0, 1, 2].map((slot) => (
          <div className={`${CELL} ${slot === 2 ? WIDE : ''}`} key={slot}>
            <Skeleton className="h-3 w-18" />
            <Skeleton className="mt-3.5 h-6 w-24" />
            <Skeleton className="mt-3.5 h-3 w-20" />
          </div>
        ))}
      </div>
    )
  }

  const { metrics, pending, breakdown } = insights
  const categories = breakdown.filter((item) => item.amount > 0).length

  return (
    <div className={STRIP}>
      <div className={`${CELL} ${WIDE}`}>
        <p className={LABEL}>Settled spend</p>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="text-[2rem] leading-none font-semibold tracking-tight tabular-nums sm:text-[2.25rem]">
            {formatMoney(metrics.settledSpend)}
          </span>
          {/*
           * Null changePercent is its own state, not zero: it means the period before this
           * one had no spend to compare against, and showing 0% would claim they were equal.
           */}
          {metrics.changePercent !== null && <Change percent={metrics.changePercent} />}
        </div>
        <p className={NOTE}>
          {metrics.changePercent === null
            ? 'no earlier spend to compare'
            : 'vs. the previous period'}
        </p>
      </div>

      <div className={CELL}>
        <p className={LABEL}>Transactions</p>
        <p className={VALUE}>{metrics.transactionCount}</p>
        <p className={NOTE}>{describeCategories(categories)}</p>
      </div>

      <div className={CELL}>
        <p className={LABEL}>Average</p>
        <p className={VALUE}>{formatMoney(metrics.averageTransaction)}</p>
        <p className={NOTE}>per transaction</p>
      </div>

      <div className={`${CELL} ${WIDE}`}>
        <p className={LABEL}>Pending</p>
        <p className={`${VALUE} ${pending.count > 0 ? 'text-pending-ink' : ''}`}>
          {formatMoney(pending.amount)}
        </p>
        <p className={`${NOTE} flex items-center gap-1.5`}>
          {pending.count > 0 && <span className="size-1.5 rounded-full bg-pending" />}
          {pending.count === 0
            ? 'nothing on hold'
            : `${pending.count === 1 ? '1 authorization' : `${pending.count} authorizations`} on hold`}
        </p>
      </div>
    </div>
  )
}
