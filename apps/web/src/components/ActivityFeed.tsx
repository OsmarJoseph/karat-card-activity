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
      <ul className="flex-1 divide-y divide-line">
        {[0, 1, 2, 3, 4].map((slot) => (
          <li key={slot} className="flex items-center gap-3 py-3">
            <Skeleton className="size-9 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3.5 w-14" />
          </li>
        ))}
      </ul>
    )
  }

  if (feed.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-offline/10 text-offline">
          <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
            <path d="M10 5.6v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="10" cy="14.2" r="1.05" fill="currentColor" />
          </svg>
        </span>
        <p className="mt-3.5 text-[13.5px] font-semibold">Could not load activity</p>
        <p className="mt-1.5 text-xs text-muted">{describeError(feed.error)}</p>
        <button
          type="button"
          onClick={() => void feed.refetch()}
          className="mt-4 rounded-xl border border-line px-4 py-2 text-[13px] font-medium transition-colors hover:bg-sunk"
        >
          Try again
        </button>
      </div>
    )
  }

  const items = feed.data.pages.flatMap((page) => page.items)

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <span className="flex size-13 items-center justify-center rounded-2xl border border-line bg-sunk text-muted">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true">
            <rect
              x="2.75"
              y="5.25"
              width="18.5"
              height="13.5"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M2.75 9.75h18.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.5 14.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <p className="mt-4 text-sm font-semibold">No card activity yet</p>
        <p className="mt-1.5 max-w-[268px] text-xs text-muted">
          A swipe on the card shows up here within about a second. Nothing to refresh.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="flex-1 divide-y divide-line">
        {items.map((item) => (
          <Row item={item} key={item.id} />
        ))}
      </ul>

      {feed.hasNextPage && (
        <button
          type="button"
          onClick={() => void feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          className="mt-4 w-full rounded-xl border border-line py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-sunk hover:text-ink disabled:opacity-60"
        >
          {feed.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
      {!feed.hasNextPage && items.length > PAGE_SIZE && (
        <p className="mt-4 text-center text-xs text-muted">That is everything.</p>
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
  const colour = CATEGORY_COLORS[item.category]

  return (
    <li className="flex items-center gap-3 py-3">
      {/* The category reads as a tint behind the initial, so the row needs no second swatch. */}
      <span
        className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl"
        aria-hidden="true"
      >
        <span className="absolute inset-0 opacity-15" style={{ backgroundColor: colour }} />
        <span className="relative text-[13px] font-semibold text-ink-soft">
          {item.merchantName.trim().slice(0, 1).toUpperCase() || '?'}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{item.merchantName}</p>
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
          className={`text-[13.5px] font-semibold tabular-nums ${
            refund ? 'text-credit-ink' : pending ? 'text-pending-ink' : 'text-ink'
          }`}
        >
          {item.formattedAmount}
        </p>
        {pending && (
          <p className="mt-0.5 text-[10.5px] font-semibold tracking-wide text-pending-ink uppercase">
            Pending
          </p>
        )}
        {refund && (
          <p className="mt-0.5 text-[10.5px] font-semibold tracking-wide text-muted uppercase">
            Refund
          </p>
        )}
      </div>
    </li>
  )
}
