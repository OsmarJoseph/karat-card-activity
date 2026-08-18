import { Injectable } from '@nestjs/common'
import { CurrentCardholderService } from '@/cardholder/current-cardholder.service'
import { averageOf, percentChange, percentOf } from '@/common/arithmetic'
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
        changePercent: percentChange(totals.settledSpend, totals.previousSettledSpend),
      },
      pending,
      breakdown: breakdown.map((row) => ({
        category: row.category,
        label: SPEND_CATEGORY_LABELS[row.category],
        amount: row.amount,
        percent: percentOf(row.amount, totals.settledSpend),
        count: row.count,
      })),
    }
  }
}
