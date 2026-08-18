import { Module } from '@nestjs/common'
import { ActivityFeedRepository } from '@/activity/activity-feed.repository'
import { ActivityController } from '@/activity/activity.controller'
import { ActivityService } from '@/activity/activity.service'
import { CardholderModule } from '@/cardholder/cardholder.module'

@Module({
  imports: [CardholderModule],
  controllers: [ActivityController],
  providers: [ActivityFeedRepository, ActivityService],
})
export class ActivityModule {}
