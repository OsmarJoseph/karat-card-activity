import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getGetActivityQueryKey, getGetInsightsQueryKey } from '@/api/generated'
import { apiBaseUrl } from '@/lib/env'

export type StreamStatus = 'connecting' | 'live' | 'offline'

/**
 * The stream says only that something changed, so the response is to refetch. Called once,
 * near the top of the tree: a second EventSource would mean a second connection.
 */
export function useActivityStream(): StreamStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StreamStatus>('connecting')

  useEffect(() => {
    const source = new EventSource(`${apiBaseUrl}/activity/stream`)

    // Called with no arguments, the generated factories return just the path, and
    // TanStack Query matches keys by prefix, so every cached page and period is covered.
    const refetchAll = (): void => {
      void queryClient.invalidateQueries({ queryKey: getGetActivityQueryKey() })
      void queryClient.invalidateQueries({ queryKey: getGetInsightsQueryKey() })
    }

    let hasConnected = false
    source.onopen = () => {
      setStatus('live')
      // A reconnect may have missed a change while the stream was down, so the cache is
      // refreshed rather than trusted. The first connection needs no refresh, because the
      // queries are loading alongside it.
      if (hasConnected) {
        refetchAll()
      }
      hasConnected = true
    }

    // EventSource retries on its own, so an error is only final once it has given up.
    source.onerror = () => {
      setStatus(source.readyState === EventSource.CLOSED ? 'offline' : 'connecting')
    }

    source.onmessage = (message: MessageEvent<string>) => {
      if (isActivityChanged(message.data)) {
        refetchAll()
      }
    }

    return () => source.close()
  }, [queryClient])

  return status
}

/** Checked rather than assumed, so a later event type does not trigger a refetch. */
function isActivityChanged(data: string): boolean {
  try {
    const payload: unknown = JSON.parse(data)
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'type' in payload &&
      payload.type === 'activity.changed'
    )
  } catch {
    return false
  }
}
