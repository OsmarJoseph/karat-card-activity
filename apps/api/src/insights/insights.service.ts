import { Injectable } from '@nestjs/common'
import { CurrentCardholderService } from '@/cardholder/current-cardholder.service'
import { SPEND_CATEGORY_LABELS } from '@/common/spend-category'
import type { Insights, InsightsQuery } from '@/insights/insights.dto'
import { InsightsRepository } from '@/insights/insights.repository'
import { resolvePeriod } from '@/insights/spend-period'

@Injectable()
export class InsightsService {
  constructor(
    private readonly cardholder: CurrentCardholderService,
    private readonly insights: InsightsRepository,
  ) {}

  async getInsights(query: InsightsQuery): Promise<Insights> {
    const cardholderId = await this.cardholder.resolveId()
    const period = resolvePeriod(query.period, new Date())

    const [totals, breakdown, pending] = await Promise.all([
      this.insights.findSettledTotals(cardholderId, period),
      this.insights.findCategoryTotals(cardholderId, period),
      this.insights.findPendingTotals(cardholderId),
    ])

    return {
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        label: period.label,
      },
      metrics: {
        settledSpend: totals.settledSpend,
        transactionCount: totals.transactionCount,
        averageTransaction: averageOf(totals.settledSpend, totals.transactionCount),
        previousPeriodSettledSpend: totals.previousSettledSpend,
        changePercent: changeAgainst(totals.settledSpend, totals.previousSettledSpend),
      },
      pending,
      breakdown: breakdown.map((row) => ({
        category: row.category,
        label: SPEND_CATEGORY_LABELS[row.category],
        amount: row.amount,
        percent: shareOf(row.amount, totals.settledSpend),
        count: row.count,
      })),
    }
  }
}

/** Whole minor units, because an average of money is still money. */
function averageOf(settledSpend: number, transactionCount: number): number {
  return transactionCount === 0 ? 0 : Math.round(settledSpend / transactionCount)
}

/** Null on a zero or negative base, where the sign of a percentage means nothing. */
function changeAgainst(current: number, previous: number): number | null {
  return previous <= 0 ? null : roundToTwoPlaces(((current - previous) / previous) * 100)
}

function shareOf(amount: number, total: number): number {
  return total <= 0 ? 0 : roundToTwoPlaces((amount / total) * 100)
}

function roundToTwoPlaces(value: number): number {
  return Math.round(value * 100) / 100
}
