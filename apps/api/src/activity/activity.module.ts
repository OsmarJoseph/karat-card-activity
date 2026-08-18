import { Module } from '@nestjs/common'
import { ActivityEventsModule } from '@/activity/activity-events.module'
import { ActivityFeedRepository } from '@/activity/activity-feed.repository'
import { ActivityStreamController } from '@/activity/activity-stream.controller'
import { ActivityController } from '@/activity/activity.controller'
import { ActivityService } from '@/activity/activity.service'
import { CardholderModule } from '@/cardholder/cardholder.module'

@Module({
  imports: [CardholderModule, ActivityEventsModule],
  controllers: [ActivityController, ActivityStreamController],
  providers: [ActivityFeedRepository, ActivityService],
})
export class ActivityModule {}
