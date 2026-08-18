import type { StreamStatus } from '@/hooks/use-activity-stream'

const APPEARANCE: Record<StreamStatus, { dot: string; text: string; label: string }> = {
  live: { dot: 'bg-credit', text: 'text-ink-soft', label: 'Live' },
  connecting: { dot: 'bg-muted animate-pulse', text: 'text-muted', label: 'Connecting' },
  offline: { dot: 'bg-offline', text: 'text-offline', label: 'Offline' },
}

/**
 * Offline is worth showing but not worth alarming over: the page still works from cache,
 * it just stops updating on its own.
 */
export function StreamBadge({ status }: { status: StreamStatus }) {
  const { dot, text, label } = APPEARANCE[status]

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${text}`}>
      <span className={`size-2 rounded-full ${dot}`} />
      <span aria-live="polite">{label}</span>
    </span>
  )
}
