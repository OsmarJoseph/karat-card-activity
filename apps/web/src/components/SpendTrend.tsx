import { scaleBand, scaleLinear } from '@visx/scale'
import { Bar } from '@visx/shape'
import { useState } from 'react'
import type { SpendTrend as SpendTrendData } from '@/api/generated'
import { Skeleton } from '@/components/Skeleton'
import { useElementWidth } from '@/hooks/use-element-width'
import { formatDay, formatMoney, formatMoneyCompact } from '@/lib/format'

const HEIGHT = 168
const AXIS_HEIGHT = 22

export function SpendTrend({
  trend,
  failed,
}: {
  trend: SpendTrendData | undefined
  failed: boolean
}) {
  if (failed) {
    return (
      <p className="flex h-[168px] items-center justify-center text-sm text-muted">
        Trend unavailable.
      </p>
    )
  }

  if (!trend) {
    return <Skeleton className="h-[168px] w-full" />
  }

  const spent = trend.points.some((point) => point.amount !== 0)
  if (!spent) {
    return (
      <p className="flex h-[168px] items-center justify-center text-sm text-muted">
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
    <div ref={ref} className="relative h-[168px] w-full">
      {width > 0 && <Bars trend={trend} width={width} />}
    </div>
  )
}

function Bars({ trend, width }: { trend: SpendTrendData; width: number }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const plotHeight = HEIGHT - AXIS_HEIGHT
  const amounts = trend.points.map((point) => point.amount)

  const x = scaleBand({
    domain: trend.points.map((point) => point.startsAt),
    range: [0, width],
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

  return (
    <>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Settled spend by ${trend.bucket}, ${trend.points.length} buckets`}
      >
        <line x1={0} x2={width} y1={zeroY} y2={zeroY} stroke="var(--color-line)" strokeWidth={1} />
        {trend.points.map((point, index) => {
          const valueY = y(point.amount)
          const left = x(point.startsAt) ?? 0
          const barWidth = x.bandwidth()
          const empty = point.amount === 0

          return (
            <g key={point.startsAt}>
              {!empty && (
                <Bar
                  x={left}
                  y={Math.min(zeroY, valueY)}
                  width={barWidth}
                  height={Math.abs(valueY - zeroY)}
                  rx={2}
                  fill={point.amount < 0 ? 'var(--color-credit)' : 'var(--color-debit)'}
                  opacity={hovered === null || hovered === index ? 1 : 0.45}
                />
              )}
              {/* A transparent full-height target, so hovering an empty bucket still works. */}
              <rect
                x={left}
                y={0}
                width={barWidth}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          )
        })}

        <text x={0} y={HEIGHT - 6} className="fill-muted text-[11px]">
          {formatDay(trend.points[0]?.startsAt ?? '')}
        </text>
        <text x={width} y={HEIGHT - 6} textAnchor="end" className="fill-muted text-[11px]">
          {formatDay(trend.points.at(-1)?.startsAt ?? '')}
        </text>
      </svg>

      <p className="absolute top-0 right-0 text-[11px] text-muted">
        peak {formatMoneyCompact(Math.max(...amounts))}
      </p>

      {active && (
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-surface">
          {unit} {formatDay(active.startsAt)}: {formatMoney(active.amount)}
        </div>
      )}
    </>
  )
}
