import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import { useState, type MouseEvent } from 'react'
import type { SpendTrend as SpendTrendData } from '@/api/generated'
import { Skeleton } from '@/components/Skeleton'
import { useElementWidth } from '@/hooks/use-element-width'
import { formatDay, formatMoney, formatMoneyCompact } from '@/lib/format'

const HEIGHT = 176
const AXIS_HEIGHT = 22
/** Room for the value labels, which sit outside the plot so the bars keep the full width. */
const AXIS_WIDTH = 44

export function SpendTrend({
  trend,
  failed,
}: {
  trend: SpendTrendData | undefined
  failed: boolean
}) {
  if (failed) {
    return (
      <p className="flex h-[176px] items-center justify-center text-sm text-muted">
        Trend unavailable.
      </p>
    )
  }

  if (!trend) {
    return <Skeleton className="h-[176px] w-full" />
  }

  const spent = trend.points.some((point) => point.amount !== 0)
  if (!spent) {
    return (
      <p className="flex h-[176px] items-center justify-center rounded-xl border border-dashed border-line-strong bg-sunk text-sm text-muted">
        Nothing settled in this period yet.
      </p>
    )
  }

  return <Plot trend={trend} />
}

function Plot({ trend }: { trend: SpendTrendData }) {
  const [ref, width] = useElementWidth()

  // The height is fixed and the width comes from the layout, so the container reserves its
  // space on the first paint and the bars fill it once measured.
  return (
    <div ref={ref} className="relative h-[176px] w-full select-none">
      {width > AXIS_WIDTH && <Bars trend={trend} width={width} />}
    </div>
  )
}

function Bars({ trend, width }: { trend: SpendTrendData; width: number }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const plotHeight = HEIGHT - AXIS_HEIGHT
  const plotWidth = width - AXIS_WIDTH
  const amounts = trend.points.map((point) => point.amount)

  const x = scaleBand({
    domain: trend.points.map((point) => point.startsAt),
    range: [0, plotWidth],
    padding: trend.points.length > 40 ? 0.15 : 0.3,
  })

  // Zero is always in the domain, so a refund bar has a baseline to hang from and a period
  // of pure spend still sits on the floor rather than floating.
  const y = scaleLinear({
    domain: [Math.min(0, ...amounts), Math.max(0, ...amounts)],
    range: [plotHeight, 0],
    nice: true,
  })

  const zeroY = y(0)
  const active = hovered === null ? null : trend.points[hovered]
  const unit = trend.bucket === 'week' ? 'week of' : ''

  const centreOf = (startsAt: string) => (x(startsAt) ?? 0) + x.bandwidth() / 2
  const firstCentre = centreOf(trend.points[0]?.startsAt ?? '')

  // Anchored to the hovered bar and kept inside the card, because a tooltip pinned to the
  // middle leaves the reader matching it to a bar by eye.
  const activeCentre = active ? AXIS_WIDTH + centreOf(active.startsAt) : 0

  /**
   * The bucket nearest the pointer, measured off one target covering the whole plot. A target
   * per bar left the padding between them unclaimed, so sweeping across the chart crossed a
   * gap every bar and blinked the tooltip out.
   */
  const track = (event: MouseEvent<SVGRectElement>) => {
    const offset = event.clientX - event.currentTarget.getBoundingClientRect().left
    const nearest = Math.round((offset - firstCentre) / x.step())
    setHovered(Math.min(Math.max(nearest, 0), trend.points.length - 1))
  }

  return (
    <>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Settled spend by ${trend.bucket}, ${trend.points.length} buckets`}
      >
        {y.ticks(3).map((value) => (
          <g key={value}>
            <line
              x1={AXIS_WIDTH}
              x2={width}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? 'var(--color-line-strong)' : 'var(--color-line)'}
              strokeWidth={1}
            />
            <text
              x={AXIS_WIDTH - 10}
              y={y(value) + 4}
              textAnchor="end"
              className="fill-muted text-[11px] tabular-nums"
            >
              {formatMoneyCompact(value)}
            </text>
          </g>
        ))}

        <g transform={`translate(${AXIS_WIDTH}, 0)`}>
          {trend.points.map((point, index) => {
            const valueY = y(point.amount)
            const left = x(point.startsAt) ?? 0
            const barWidth = x.bandwidth()

            // An empty bucket keeps a stub, so a quiet stretch reads as part of the window.
            return point.amount === 0 ? (
              <Bar
                key={point.startsAt}
                x={left}
                y={zeroY - 1.25}
                width={barWidth}
                height={2.5}
                rx={1.25}
                fill="var(--color-line-strong)"
              />
            ) : (
              <Bar
                key={point.startsAt}
                x={left}
                y={Math.min(zeroY, valueY)}
                width={barWidth}
                height={Math.abs(valueY - zeroY)}
                rx={3}
                fill={point.amount < 0 ? 'var(--color-credit)' : 'var(--color-debit)'}
                opacity={hovered === null || hovered === index ? 1 : 0.4}
              />
            )
          })}

          {/* Transparent and full height, so an empty bucket answers to the pointer too. */}
          <rect
            x={0}
            y={0}
            width={plotWidth}
            height={plotHeight}
            fill="transparent"
            onMouseMove={track}
            onMouseLeave={() => setHovered(null)}
          />
        </g>

        <text x={AXIS_WIDTH} y={HEIGHT - 5} className="fill-muted text-[11px]">
          {formatDay(trend.points[0]?.startsAt ?? '')}
        </text>
        <text x={width} y={HEIGHT - 5} textAnchor="end" className="fill-muted text-[11px]">
          {formatDay(trend.points.at(-1)?.startsAt ?? '')}
        </text>
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-surface shadow-card"
          style={{ left: Math.min(Math.max(activeCentre, 64), width - 64) }}
        >
          {unit} {formatDay(active.startsAt)}: {formatMoney(active.amount)}
        </div>
      )}
    </>
  )
}
