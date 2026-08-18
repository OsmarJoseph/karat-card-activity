import { Group } from '@visx/group'
import { Pie } from '@visx/shape'
import type { SpendBreakdownItem } from '@/api/generated'
import { Skeleton } from '@/components/Skeleton'
import { CATEGORY_COLORS } from '@/lib/categories'
import { formatMoney, formatPercent } from '@/lib/format'

const SIZE = 200
const THICKNESS = 34

/**
 * A ring is a picture of proportions, and a negative slice has no length, so a category
 * whose refunds outweighed its spend cannot be drawn. Those are listed underneath instead,
 * which keeps the ring truthful without losing the information.
 *
 * The share shown in the legend is each category's share of the ring, computed here so the
 * numbers and the arcs agree. It is deliberately not the API's `percent`, which is measured
 * against net spend and so would not sum to 100 once refunds are set aside.
 */
export function CategoryDonut({
  breakdown,
  failed,
}: {
  breakdown: SpendBreakdownItem[] | undefined
  failed: boolean
}) {
  if (failed) {
    return <p className="py-10 text-center text-sm text-muted">Breakdown unavailable.</p>
  }

  if (!breakdown) {
    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Skeleton className="size-[200px] shrink-0 rounded-full" />
        <div className="w-full space-y-2">
          {[0, 1, 2, 3].map((slot) => (
            <Skeleton className="h-4 w-full" key={slot} />
          ))}
        </div>
      </div>
    )
  }

  const spent = breakdown.filter((item) => item.amount > 0)
  const refunded = breakdown.filter((item) => item.amount < 0)
  const total = spent.reduce((sum, item) => sum + item.amount, 0)

  if (total === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        No settled spend in this period yet.
        {refunded.length > 0 && ' Refunds only, listed below.'}
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-[180px] shrink-0 sm:size-[200px]"
          role="img"
          aria-label={`Spend by category, ${formatMoney(total)} across ${spent.length} categories`}
        >
          <Group top={SIZE / 2} left={SIZE / 2}>
            <Pie
              data={spent}
              pieValue={(item) => item.amount}
              outerRadius={SIZE / 2}
              innerRadius={SIZE / 2 - THICKNESS}
              padAngle={0.012}
              // Already sorted largest first by the API, and re-sorting would break the
              // legend's correspondence with the ring.
              pieSort={null}
            >
              {(pie) =>
                pie.arcs.map((arc) => (
                  <path
                    key={arc.data.category}
                    d={pie.path(arc) ?? undefined}
                    fill={CATEGORY_COLORS[arc.data.category]}
                  />
                ))
              }
            </Pie>
          </Group>
        </svg>

        <ul className="w-full space-y-1.5">
          {spent.map((item) => (
            <li key={item.category} className="flex items-center gap-2.5 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink-soft">{item.label}</span>
              <span className="tabular-nums">{formatMoney(item.amount)}</span>
              <span className="w-12 text-right tabular-nums text-muted">
                {formatPercent((item.amount / total) * 100)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {refunded.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          {refunded.map((item) => (
            <li key={item.category} className="flex items-center gap-2 text-muted">
              <span className="flex-1 truncate">{item.label}</span>
              <span className="tabular-nums text-credit">{formatMoney(item.amount)}</span>
              <span className="text-xs">net refund, not in the ring</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
