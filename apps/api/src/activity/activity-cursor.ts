import { z } from 'zod'

/**
 * Carries both halves of the `(occurred_at DESC, id DESC)` sort. Stripe timestamps are
 * whole seconds, so ties are ordinary, and a timestamp alone would skip or repeat rows
 * across a page boundary.
 */
export interface ActivityCursor {
  occurredAt: Date
  id: string
}

const encodedCursorSchema = z.object({
  t: z.iso.datetime(),
  i: z.uuid(),
})

/** Base64 so clients cannot couple to the sort order, which is ours to change. */
export function encodeCursor(cursor: ActivityCursor): string {
  const encoded: z.infer<typeof encodedCursorSchema> = {
    t: cursor.occurredAt.toISOString(),
    i: cursor.id,
  }
  return Buffer.from(JSON.stringify(encoded), 'utf8').toString('base64url')
}

/** Null for anything this API did not issue, leaving the HTTP response to the caller. */
export function decodeCursor(raw: string): ActivityCursor | null {
  const decoded = encodedCursorSchema.safeParse(
    parseJsonOrNull(Buffer.from(raw, 'base64url').toString('utf8')),
  )
  if (!decoded.success) {
    return null
  }

  return { occurredAt: new Date(decoded.data.t), id: decoded.data.i }
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
