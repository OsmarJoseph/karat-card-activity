import type { StreamStatus } from '@/hooks/use-activity-stream'

const APPEARANCE: Record<StreamStatus, { pill: string; dot: string; label: string }> = {
  live: {
    pill: 'border-credit/20 bg-credit/10 text-credit-ink',
    dot: 'bg-credit ring-3 ring-credit/20',
    label: 'Live',
  },
  connecting: {
    pill: 'border-line bg-sunk text-muted',
    dot: 'bg-muted animate-pulse',
    label: 'Connecting',
  },
  offline: {
    pill: 'border-offline/25 bg-offline/10 text-offline',
    dot: 'bg-offline',
    label: 'Offline',
  },
}

/**
 * Offline is worth showing but not worth alarming over: the page still works from cache,
 * it just stops updating on its own.
 */
export function StreamBadge({ status }: { status: StreamStatus }) {
  const { pill, dot, label } = APPEARANCE[status]

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border py-1 pr-2.5 pl-2 text-[11px] font-semibold tracking-wide ${pill}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span aria-live="polite">{label}</span>
    </span>
  )
}
