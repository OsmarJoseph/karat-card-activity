import { useState } from 'react'
import { GetInsightsPeriod, useGetInsights } from '@/api/generated'
import { describeError } from '@/api/http'
import { ActivityFeed } from '@/components/ActivityFeed'
import { Card } from '@/components/Card'
import { CategoryDonut } from '@/components/CategoryDonut'
import { MetricTiles } from '@/components/MetricTiles'
import { PeriodSelector } from '@/components/PeriodSelector'
import { SpendTrend } from '@/components/SpendTrend'
import { StreamBadge } from '@/components/StreamBadge'
import { useActivityStream } from '@/hooks/use-activity-stream'
import { formatDay } from '@/lib/format'

export function App() {
  const [period, setPeriod] = useState<GetInsightsPeriod>(GetInsightsPeriod.current_month)
  const streamStatus = useActivityStream()
  const insights = useGetInsights({ period })
  const range = insights.data?.period

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[27px]">Card activity</h1>
            <StreamBadge status={streamStatus} />
          </div>
          {/* Holds its line while loading, so the header does not jump when the window lands. */}
          <p className="min-h-[19px] text-[13px] text-muted">
            {range && `${formatDay(range.start)} – ${formatDay(range.end)}`}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} busy={insights.isFetching} />
      </header>

      {insights.isError ? (
        <div className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl border border-offline/25 bg-surface p-4 shadow-card sm:p-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-offline/10 text-offline">
            <svg viewBox="0 0 16 16" className="size-4" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 4.6v4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="8" cy="11.4" r="0.95" fill="currentColor" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold">Insights are unavailable</p>
            <p className="mt-1 text-xs text-muted">
              The feed below is still live. {describeError(insights.error)}
            </p>
          </div>
        </div>
      ) : (
        // Undefined while loading, which is what each component renders a skeleton for.
        <div className="mb-5">
          <MetricTiles insights={insights.data} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-5">
          <Card
            title="By category"
            action={<span className="text-xs text-muted">Share of settled charges</span>}
          >
            <CategoryDonut breakdown={insights.data?.breakdown} failed={insights.isError} />
          </Card>
          <Card
            title="Settled spend"
            action={
              <span className="text-xs text-muted">by {insights.data?.trend.bucket ?? 'day'}</span>
            }
          >
            <SpendTrend trend={insights.data?.trend} failed={insights.isError} />
          </Card>
        </div>

        {/* Out of flow once the columns sit side by side, so the row takes its height from
            the charts and the feed scrolls inside what is left rather than running past them. */}
        <div className="relative">
          <Card
            title="Activity"
            action={<span className="text-xs text-muted">Newest first</span>}
            className="flex flex-col lg:absolute lg:inset-0"
          >
            <ActivityFeed />
          </Card>
        </div>
      </div>
    </div>
  )
}
