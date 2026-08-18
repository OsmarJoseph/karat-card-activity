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

export function App() {
  const [period, setPeriod] = useState<GetInsightsPeriod>(GetInsightsPeriod.current_month)
  const streamStatus = useActivityStream()
  const insights = useGetInsights({ period })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold sm:text-2xl">Card activity</h1>
          <StreamBadge status={streamStatus} />
        </div>
        <PeriodSelector value={period} onChange={setPeriod} busy={insights.isFetching} />
      </header>

      {insights.isError ? (
        <Card className="mb-6">
          <p className="text-sm text-offline">
            Insights unavailable: {describeError(insights.error)}
          </p>
        </Card>
      ) : (
        // Undefined while loading, which is what each component renders a skeleton for.
        <div className="mb-6">
          <MetricTiles insights={insights.data} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <Card title="By category">
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

        <Card title="Activity">
          <ActivityFeed />
        </Card>
      </div>
    </div>
  )
}
