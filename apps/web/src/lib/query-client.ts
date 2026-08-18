import { QueryClient } from '@tanstack/react-query'

/**
 * The event stream is what keeps the dashboard fresh, so nothing here polls and a window
 * regaining focus does not refetch. Cached data is trusted until the server says it moved.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Number.POSITIVE_INFINITY,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })
}
