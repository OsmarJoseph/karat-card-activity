import { useGetActivity, useGetInsights } from '@/api/generated'
import { describeError } from '@/api/http'
import { useActivityStream } from '@/hooks/use-activity-stream'

/**
 * A wiring check rather than the dashboard. What it proves is that the generated client,
 * the query provider and the event stream are connected end to end. Phase 8 replaces it
 * with the real feed, metric tiles and charts.
 */
export function App() {
  const streamStatus = useActivityStream()
  const activity = useGetActivity({ limit: 5 })
  const insights = useGetInsights()

  return (
    <main>
      <h1>Card activity</h1>
      <p>stream: {streamStatus}</p>

      <h2>Feed</h2>
      {activity.isPending && <p>loading</p>}
      {activity.isError && <p>failed: {describeError(activity.error)}</p>}
      {activity.data?.items.length === 0 && <p>no activity yet</p>}
      {activity.data && activity.data.items.length > 0 && (
        <ul>
          {activity.data.items.map((item) => (
            <li key={item.id}>
              {item.occurredAt} {item.merchantName} {item.formattedAmount} {item.status}
            </li>
          ))}
        </ul>
      )}

      <h2>Insights</h2>
      {insights.isPending && <p>loading</p>}
      {insights.isError && <p>failed: {describeError(insights.error)}</p>}
      {insights.data && (
        <p>
          {insights.data.period.label}: settled {insights.data.metrics.settledSpend}, pending{' '}
          {insights.data.pending.count} worth {insights.data.pending.amount}
        </p>
      )}
    </main>
  )
}
