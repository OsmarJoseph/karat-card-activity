import { BadRequestException, Injectable } from '@nestjs/common'
import { type ActivityCursor, decodeCursor, encodeCursor } from '@/activity/activity-cursor'
import { ActivityFeedRepository, type ActivityFeedRow } from '@/activity/activity-feed.repository'
import type { ActivityItem, ActivityPage, ActivityQuery } from '@/activity/activity.dto'
import { CurrentCardholderService } from '@/cardholder/current-cardholder.service'
import { formatMinorUnits } from '@/common/money'
import { SPEND_CATEGORY_LABELS } from '@/common/spend-category'

@Injectable()
export class ActivityService {
  constructor(
    private readonly cardholder: CurrentCardholderService,
    private readonly feed: ActivityFeedRepository,
  ) {}

  async getPage(query: ActivityQuery): Promise<ActivityPage> {
    const cardholderId = await this.cardholder.resolveId()
    const page = await this.feed.findPage({
      cardholderId,
      limit: query.limit,
      cursor: query.cursor === undefined ? null : parseCursor(query.cursor),
      filter: query.kind,
      category: query.category ?? null,
    })

    const resumeFrom = page.hasMore ? page.rows.at(-1) : undefined
    return {
      items: page.rows.map(toActivityItem),
      nextCursor: resumeFrom ? encodeCursor(resumeFrom) : null,
      hasMore: page.hasMore,
    }
  }
}

function parseCursor(raw: string): ActivityCursor {
  const cursor = decodeCursor(raw)
  if (!cursor) {
    // Rejected rather than ignored: restarting at page one would loop a client forever.
    throw new BadRequestException('cursor is not a cursor this API issued.')
  }
  return cursor
}

function toActivityItem(row: ActivityFeedRow): ActivityItem {
  return {
    id: row.id,
    kind: row.kind,
    status: row.kind === 'authorization' ? 'pending' : 'settled',
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    formattedAmount: formatMinorUnits(row.amount, row.currency),
    merchantName: row.merchantName,
    category: row.category,
    categoryLabel: SPEND_CATEGORY_LABELS[row.category],
    occurredAt: row.occurredAt.toISOString(),
  }
}
