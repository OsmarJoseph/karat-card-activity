import { Controller, Get, Query } from '@nestjs/common'
import { ZodResponse } from 'nestjs-zod'
import { InsightsDto, InsightsQueryDto, type Insights } from '@/insights/insights.dto'
import { InsightsService } from '@/insights/insights.service'

@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get()
  @ZodResponse({ status: 200, type: InsightsDto })
  getInsights(@Query() query: InsightsQueryDto): Promise<Insights> {
    return this.insights.getInsights(query)
  }
}
