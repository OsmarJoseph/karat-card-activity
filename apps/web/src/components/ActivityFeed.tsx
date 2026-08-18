import { ActivityItemStatus, useGetActivityInfinite, type ActivityItem } from '@/api/generated'
import { describeError } from '@/api/http'
import { Skeleton } from '@/components/Skeleton'
import { CATEGORY_COLORS } from '@/lib/categories'
import { formatDay, formatTimeOfDay } from '@/lib/format'

const PAGE_SIZE = 15

export function ActivityFeed() {
  const feed = useGetActivityInfinite(
    { limit: PAGE_SIZE },
    {
      query: {
        initialPageParam: undefined,
        // nextCursor is null on the last page, and undefined is how TanStack Query is told
        // there is nothing further to ask for.
        getNextPageParam: (page) => page.nextCursor ?? undefined,
      },
    },
  )

  if (feed.isPending) {
    return (
      <ul className="divide-y divide-line">
        {[0, 1, 2, 3, 4].map((slot) => (
          <li key={slot} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </li>
        ))}
      </ul>
    )
  }

  if (feed.isError) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-offline">{describeError(feed.error)}</p>
        <button
          type="button"
          onClick={() => void feed.refetch()}
          className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-canvas"
        >
          Try again
        </button>
      </div>
    )
  }

  const items = feed.data.pages.flatMap((page) => page.items)

  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-ink-soft">No card activity yet.</p>
        <p className="mt-1 text-xs text-muted">
          A swipe on the card appears here within about a second.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <Row item={item} key={item.id} />
        ))}
      </ul>

      {feed.hasNextPage && (
        <button
          type="button"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          className="mt-3 w-full rounded-md border border-line py-2 text-sm text-ink-soft hover:bg-canvas disabled:opacity-60"
        >
          {feed.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
      {!feed.hasNextPage && items.length > PAGE_SIZE && (
        <p className="mt-3 text-center text-xs text-muted">That is everything.</p>
      )}
    </>
  )
}

/**
 * Three row treatments, driven by what the money is doing rather than by which Stripe object
 * it came from: still on hold, charged, or returned.
 */
function Row({ item }: { item: ActivityItem }) {
  const pending = item.status === ActivityItemStatus.pending
  const refund = item.type === 'refund'

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className="size-2.5 shrink-0 rounded-sm"
        style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.merchantName}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          {/* Hidden below sm, where merchant and amount need the width more. */}
          <span className="hidden truncate sm:inline">{item.categoryLabel}</span>
          <span className="hidden sm:inline">·</span>
          <span className="whitespace-nowrap">
            {formatDay(item.occurredAt)}, {formatTimeOfDay(item.occurredAt)}
          </span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={`text-sm font-semibold tabular-nums ${
            refund ? 'text-credit' : pending ? 'text-pending' : 'text-ink'
          }`}
        >
          {item.formattedAmount}
        </p>
        {pending && <p className="mt-0.5 text-xs text-pending">Pending</p>}
        {refund && <p className="mt-0.5 text-xs text-muted">Refund</p>}
      </div>
    </li>
  )
}
