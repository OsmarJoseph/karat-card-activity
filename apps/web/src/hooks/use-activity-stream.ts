import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getGetActivityQueryKey, getGetInsightsQueryKey } from '@/api/generated'
import { apiBaseUrl } from '@/lib/env'

export type StreamStatus = 'connecting' | 'live' | 'offline'

/**
 * Taken from the generated factories rather than written out, so a path change in the API
 * cannot leave this matching nothing.
 */
const ACTIVITY_PATH = getGetActivityQueryKey()[0]
const INSIGHTS_PATH = getGetInsightsQueryKey()[0]

/**
 * The stream says only that something changed, so the response is to refetch. Called once,
 * near the top of the tree: a second EventSource would mean a second connection.
 */
export function useActivityStream(): StreamStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StreamStatus>('connecting')

  useEffect(() => {
    const source = new EventSource(`${apiBaseUrl}/activity/stream`)

    /**
     * Every cached query here is a projection of card activity, so they all go stale
     * together. Matched on the path appearing anywhere in the key rather than as a prefix,
     * because an infinite query's key begins with 'infinite' and a prefix match on the path
     * alone silently misses it, which is exactly the feed.
     */
    const refetchAll = (): void => {
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey.includes(ACTIVITY_PATH) || query.queryKey.includes(INSIGHTS_PATH),
      })
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

    source.onerror = () => {
      setStatus('offline')
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
