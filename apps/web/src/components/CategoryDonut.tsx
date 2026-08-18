import { Group } from '@visx/group'
import { Pie } from '@visx/shape'
import type { SpendBreakdownItem } from '@/api/generated'
import { Skeleton } from '@/components/Skeleton'
import { CATEGORY_COLORS } from '@/lib/categories'
import { formatMoney, formatPercent } from '@/lib/format'

const SIZE = 200
const THICKNESS = 32

/**
 * A ring is a picture of proportions, and a negative slice has no length, so a category
 * whose refunds outweighed its spend is left out of the ring rather than drawn wrong. The
 * centre says whether that happened, which is why its total can exceed settled spend.
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
    return <p className="py-12 text-center text-sm text-muted">Breakdown unavailable.</p>
  }

  if (!breakdown) {
    return (
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Skeleton className="size-[200px] shrink-0 rounded-full" />
        <div className="w-full space-y-2.5">
          {[0, 1, 2, 3].map((slot) => (
            <Skeleton className="h-5 w-full" key={slot} />
          ))}
        </div>
      </div>
    )
  }

  const spent = breakdown.filter((item) => item.amount > 0)
  const refunded = breakdown.some((item) => item.amount < 0)
  const total = spent.reduce((sum, item) => sum + item.amount, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <svg viewBox="0 0 100 100" className="size-[92px]" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="36"
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="13"
            strokeDasharray="4 7"
            strokeLinecap="round"
          />
        </svg>
        <p className="mt-4 text-sm font-semibold">No settled spend yet</p>
        <p className="mt-1.5 max-w-[280px] text-xs text-muted">
          {refunded
            ? 'This period holds refunds only, so there are no proportions to draw.'
            : 'Categories appear here as soon as a charge settles.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative shrink-0">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-[180px] sm:size-[200px]"
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

        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          <span className="text-xl font-semibold tracking-tight tabular-nums">
            {formatMoney(total)}
          </span>
          <span className="mt-0.5 text-[11px] text-muted">
            {refunded ? 'before refunds' : 'settled'}
          </span>
        </div>
      </div>

      <ul className="w-full space-y-0.5">
        {spent.map((item) => {
          const share = (item.amount / total) * 100
          const colour = CATEGORY_COLORS[item.category]

          return (
            <li
              key={item.category}
              className="relative flex items-center gap-2.5 overflow-hidden rounded-lg px-3 py-2 text-sm"
            >
              {/* The row doubles as its own bar, which is what fills the space beside the ring. */}
              <span
                className="absolute inset-y-0 left-0 opacity-15"
                style={{ width: `${share}%`, backgroundColor: colour }}
              />
              <span
                className="relative size-2 shrink-0 rounded-[3px]"
                style={{ backgroundColor: colour }}
              />
              <span className="relative min-w-0 flex-1 truncate font-medium">{item.label}</span>
              <span className="relative font-semibold tabular-nums">
                {formatMoney(item.amount)}
              </span>
              <span className="relative w-12 text-right text-xs text-muted tabular-nums">
                {formatPercent(share)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
