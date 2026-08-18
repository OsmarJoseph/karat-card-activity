import type { Insights } from '@/api/generated'
import { Skeleton } from '@/components/Skeleton'
import { formatChange, formatMoney } from '@/lib/format'

const TILE = 'rounded-xl border border-line bg-surface p-4'
const LABEL = 'text-xs font-medium tracking-wide text-muted uppercase'
const VALUE = 'mt-1 text-2xl font-semibold tabular-nums'

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={TILE}>
      <p className={LABEL}>{label}</p>
      {children}
    </div>
  )
}

/**
 * Null changePercent is its own state, not zero: it means the period before this one had no
 * spend to compare against, and showing 0% would claim the two were equal.
 */
function Change({ percent }: { percent: number | null }) {
  if (percent === null) {
    return <p className="mt-1 text-xs text-muted">no earlier spend to compare</p>
  }

  const rose = percent > 0
  return (
    <p className={`mt-1 text-xs font-medium ${rose ? 'text-pending' : 'text-credit'}`}>
      {rose ? '▲' : '▼'} {formatChange(percent)} vs previous
    </p>
  )
}

export function MetricTiles({ insights }: { insights: Insights | undefined }) {
  const grid = 'grid grid-cols-2 gap-3 lg:grid-cols-4'

  if (!insights) {
    return (
      <div className={grid}>
        {[0, 1, 2, 3].map((slot) => (
          <div className={TILE} key={slot}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-28" />
          </div>
        ))}
      </div>
    )
  }

  const { metrics, pending } = insights

  return (
    <div className={grid}>
      <Tile label="Settled spend">
        <p className={VALUE}>{formatMoney(metrics.settledSpend)}</p>
        <Change percent={metrics.changePercent} />
      </Tile>

      <Tile label="Transactions">
        <p className={VALUE}>{metrics.transactionCount}</p>
        <p className="mt-1 text-xs text-muted">{insights.period.label}</p>
      </Tile>

      <Tile label="Average">
        <p className={VALUE}>{formatMoney(metrics.averageTransaction)}</p>
        <p className="mt-1 text-xs text-muted">per transaction</p>
      </Tile>

      <Tile label="Pending">
        <p className={`${VALUE} ${pending.count > 0 ? 'text-pending' : ''}`}>
          {formatMoney(pending.amount)}
        </p>
        <p className="mt-1 text-xs text-muted">
          {pending.count === 1 ? '1 authorization' : `${pending.count} authorizations`} on hold
        </p>
      </Tile>
    </div>
  )
}
