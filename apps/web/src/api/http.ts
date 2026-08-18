import { apiBaseUrl } from '@/lib/env'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * The single place requests leave the browser. Orval generates every hook against this,
 * so the base URL and the failure shape are decided once.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init)

  if (!response.ok) {
    // The API answers a rejected query with a message worth showing, so it is read
    // rather than replaced with the status code alone.
    throw new ApiError(response.status, await readErrorMessage(response))
  }

  return response.json() as Promise<T>
}

/** Anything a query can reject with, rendered for a person to read. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.status}: ${error.message}`
  }
  return error instanceof Error ? error.message : 'unknown failure'
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body !== null && typeof body === 'object' && 'message' in body) {
      return String(body.message)
    }
  } catch {
    // Not JSON, so the status text is the best available description.
  }
  return response.statusText
}
