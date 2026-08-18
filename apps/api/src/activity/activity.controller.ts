import { Controller, Get, Query } from '@nestjs/common'
import { ZodResponse } from 'nestjs-zod'
import { ActivityPageDto, ActivityQueryDto, type ActivityPage } from '@/activity/activity.dto'
import { ActivityService } from '@/activity/activity.service'

@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  @Get()
  @ZodResponse({ status: 200, type: ActivityPageDto })
  getActivity(@Query() query: ActivityQueryDto): Promise<ActivityPage> {
    return this.activity.getPage(query)
  }
}
